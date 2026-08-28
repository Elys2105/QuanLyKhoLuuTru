import argparse
import contextlib
import json
import os
import sys
import tempfile
import time
import traceback
from pathlib import Path

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["OMP_NUM_THREADS"] = "6"

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

import fitz
from paddleocr import PaddleOCR
from ocr_text_cleanup import clean_ocr_text



def _clean_payload_text_fields(payload):
    """
    Làm sạch các field text trước khi worker trả JSON.
    Không đụng normalized_text vì field này cố ý bỏ dấu để search.
    """
    try:
        if isinstance(payload, dict):
            for key in ("text", "extracted_text", "best_text"):
                if key in payload and isinstance(payload[key], str):
                    payload[key] = clean_ocr_text(payload[key])

            data = payload.get("data")
            if isinstance(data, dict):
                for key in ("text", "extracted_text", "best_text"):
                    if key in data and isinstance(data[key], str):
                        data[key] = clean_ocr_text(data[key])

        return payload
    except Exception:
        return payload


def write_json(payload, exit_code=0):
    payload = _clean_payload_text_fields(payload)
    data = json.dumps(payload, ensure_ascii=False)
    sys.stdout.write(data)
    sys.stdout.write("\n")
    sys.stdout.flush()
    sys.exit(exit_code)


def extract_text_layer_first(pdf_path: Path):
    doc = fitz.open(str(pdf_path))
    pages = []

    for page_index in range(len(doc)):
        page = doc.load_page(page_index)
        text = (page.get_text("text") or "").strip()

        if text:
            pages.append({
                "page": page_index + 1,
                "text": text,
            })

    doc.close()

    final_text = "\n\n".join(
        f"===== PAGE {item['page']} =====\n{item['text']}"
        for item in pages
    ).strip()

    return pages, final_text


def render_pdf_pages(pdf_path: Path, output_dir: Path, dpi: int, max_pages: int = 0):
    doc = fitz.open(str(pdf_path))
    total_pages = len(doc)

    if max_pages and max_pages > 0:
        page_limit = min(total_pages, max_pages)
    else:
        page_limit = total_pages

    image_paths = []

    for page_index in range(page_limit):
        page = doc.load_page(page_index)
        pix = page.get_pixmap(dpi=dpi, alpha=False)

        image_path = output_dir / f"page_{page_index + 1}.png"
        pix.save(str(image_path))

        image_paths.append(image_path)

    doc.close()
    return total_pages, image_paths


def build_fast_ocr():
    return PaddleOCR(
        use_angle_cls=False,
        lang="vi",
        use_gpu=False,
        enable_mkldnn=False,
        show_log=False,
        det_limit_side_len=960,
        det_limit_type="max",
        rec_batch_num=16,
        cpu_threads=6,
    )


def build_quality_detector():
    return PaddleOCR(
        use_angle_cls=False,
        lang="vi",
        use_gpu=False,
        enable_mkldnn=False,
        show_log=False,
        det_limit_side_len=960,
        det_limit_type="max",
        rec=False,
        cpu_threads=6,
    )


def extract_paddle_text(result):
    lines = []

    if not isinstance(result, list):
        return ""

    for page_result in result:
        if not isinstance(page_result, list):
            continue

        for item in page_result:
            try:
                text = str(item[1][0]).strip()
                if text:
                    lines.append(text)
            except Exception:
                pass

    return "\n".join(lines).strip()


def run_fast_page(ocr, image_path: Path):
    result = ocr.ocr(str(image_path), cls=False)
    return extract_paddle_text(result)


def run_quality_pages(image_paths, args):
    try:
        from PIL import Image
        from vietocr.tool.config import Cfg
        from vietocr.tool.predictor import Predictor
    except Exception as exc:
        raise RuntimeError(
            "Thiếu thư viện VietOCR/Pillow. Chạy: "
            ".\\.venv_ocr_paddle\\Scripts\\pip.exe install vietocr pillow"
        ) from exc

    config = Cfg.load_config_from_name(args.vietocr_model)
    config["cnn"]["pretrained"] = False
    config["device"] = "cpu"
    config["predictor"]["beamsearch"] = False
    config["dataset"]["image_height"] = 32
    config["dataset"]["image_min_width"] = 32
    config["dataset"]["image_max_width"] = 512

    with contextlib.redirect_stdout(sys.stderr):
        detector = build_quality_detector()
        recognizer = Predictor(config)

    page_texts = []

    for page_number, image_path in enumerate(image_paths, start=1):
        page_started = time.time()

        import cv2

        image = Image.open(image_path).convert("RGB")
        image_cv = cv2.imread(str(image_path))

        with contextlib.redirect_stdout(sys.stderr):
            det_output = detector.text_detector(image_cv)

        lines = []

        boxes = []
        if isinstance(det_output, tuple):
            boxes = det_output[0]
        else:
            boxes = det_output

        if boxes is None:
            boxes = []

        boxes = sorted(
            boxes,
            key=lambda box: (
                min(p[1] for p in box),
                min(p[0] for p in box),
            ),
        )

        for box in boxes:
            try:
                xs = [p[0] for p in box]
                ys = [p[1] for p in box]

                left = max(0, int(min(xs)) - 3)
                top = max(0, int(min(ys)) - 3)
                right = min(image.width, int(max(xs)) + 3)
                bottom = min(image.height, int(max(ys)) + 3)

                if right <= left or bottom <= top:
                    continue

                crop = image.crop((left, top, right, bottom))
                text = recognizer.predict(crop).strip()

                if text:
                    lines.append(text)
            except Exception:
                continue

        text = "\n".join(lines).strip()
        seconds = round(time.time() - page_started, 2)

        page_texts.append({
            "page": page_number,
            "text": text,
            "seconds": seconds,
        })

        print(
            f"QUALITY PAGE {page_number}/{len(image_paths)} done in {seconds}s",
            file=sys.stderr,
            flush=True,
        )

    return page_texts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--language", default="vi")
    parser.add_argument("--dpi", type=int, default=120)
    parser.add_argument("--max-pages", type=int, default=0)
    parser.add_argument("--mode", default="fast", choices=["fast", "quality"])
    parser.add_argument("--force-ocr", action="store_true", help="Force OCR, skip PDF text layer")
    parser.add_argument("--page-timeout", type=int, default=120)
    parser.add_argument("--vietocr-model", default="vgg_transformer")

    args = parser.parse_args()
    force_ocr = bool(getattr(args, "force_ocr", False))
    force_ocr = force_ocr or args.mode == "quality"

    pdf_path = Path(args.pdf)

    if not pdf_path.exists():
        write_json({
            "success": False,
            "error": f"PDF không tồn tại: {pdf_path}",
        }, 2)

    started = time.time()

    try:
        text_pages, text_layer = extract_text_layer_first(pdf_path)

        if text_layer and not force_ocr:
            write_json({
                "success": True,
                "engine": "pymupdf-text-layer",
                "requested_language": args.language,
                "language": "vi",
                "dpi": 0,
                "page_count": len(text_pages),
                "character_count": len(text_layer),
                "text": text_layer,
                "raw_text": text_layer,
                "pages": text_pages,
            })

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            total_pages, image_paths = render_pdf_pages(
                pdf_path=pdf_path,
                output_dir=temp_path,
                dpi=args.dpi,
                max_pages=args.max_pages,
            )

            if args.mode == "fast":
                # V82R18: scanned Vietnamese FAST keeps the fast text-layer shortcut above,
                # but image recognition uses Paddle detection + VietOCR vgg_transformer
                # instead of PaddleOCR's generic recognizer, which drops/corrupts diacritics.
                if args.vietocr_model != "vgg_transformer":
                    raise RuntimeError(
                        "FAST VietOCR model contract must be vgg_transformer; got "
                        + str(args.vietocr_model)
                    )
                page_texts = run_quality_pages(image_paths, args)
                engine = f"paddle-det+vietocr-rec:{args.vietocr_model}"

            else:
                page_texts = run_quality_pages(image_paths, args)
                engine = f"paddle-det+vietocr-rec:{args.vietocr_model}"

            final_text = "\n\n".join(
                f"===== PAGE {item['page']} =====\n{item['text']}"
                for item in page_texts
            ).strip()

            write_json({
                "success": True,
                "engine": engine,
                "requested_language": args.language,
                "language": "vi",
                "mode": args.mode,
                "dpi": args.dpi,
                "total_pdf_pages": total_pages,
                "page_count": len(image_paths),
                "character_count": len(final_text),
                "seconds": round(time.time() - started, 2),
                "text": final_text,
                "pages": page_texts,
            }, 0)

    except Exception as exc:
        write_json({
            "success": False,
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }, 1)


if __name__ == "__main__":
    main()
