import os
import time
import tempfile
from pathlib import Path
from typing import Literal

import cv2
import fitz
import numpy as np
from fastapi import FastAPI, File, Form, UploadFile
from PIL import Image

app = FastAPI(title="Archive OCR Service")


def render_pdf(pdf_path: Path, dpi: int = 180, max_pages: int = 2):
    doc = fitz.open(str(pdf_path))
    images = []

    total_pages = len(doc)
    limit = min(total_pages, max_pages)

    for i in range(limit):
        page = doc.load_page(i)
        pix = page.get_pixmap(dpi=dpi, alpha=False)
        image_path = pdf_path.parent / f"page_{i + 1}.png"
        pix.save(str(image_path))
        images.append((i + 1, image_path))

    doc.close()
    return total_pages, images


def run_paddle(images):
    from paddleocr import PaddleOCR

    ocr = PaddleOCR(
        use_angle_cls=False,
        lang="vi",
        use_gpu=False,
        enable_mkldnn=False,
        show_log=False,
    )

    pages = []

    for page_number, image_path in images:
        result = ocr.ocr(str(image_path), cls=False)
        lines = []

        for block in result:
            if not block:
                continue

            for item in block:
                try:
                    text = item[1][0]
                    score = float(item[1][1])
                    box = item[0]
                    lines.append({
                        "text": text,
                        "confidence": score,
                        "bbox": box,
                    })
                except Exception:
                    pass

        pages.append({
            "page": page_number,
            "text": "\n".join(line["text"] for line in lines),
            "blocks": lines,
        })

    return pages


def run_easyocr(images):
    import easyocr

    reader = easyocr.Reader(["vi", "en"], gpu=False)

    pages = []

    for page_number, image_path in images:
        result = reader.readtext(str(image_path), detail=1, paragraph=False)

        lines = []
        for box, text, score in result:
            lines.append({
                "text": text,
                "confidence": float(score),
                "bbox": box,
            })

        pages.append({
            "page": page_number,
            "text": "\n".join(line["text"] for line in lines),
            "blocks": lines,
        })

    return pages


def crop_box(image, box):
    points = np.array(box).astype(np.int32)
    x_min = max(0, int(points[:, 0].min()))
    y_min = max(0, int(points[:, 1].min()))
    x_max = int(points[:, 0].max())
    y_max = int(points[:, 1].max())

    return image[y_min:y_max, x_min:x_max]


def run_vietocr(images):
    import easyocr
    from vietocr.tool.config import Cfg
    from vietocr.tool.predictor import Predictor

    detector = easyocr.Reader(["vi", "en"], gpu=False)

    config = Cfg.load_config_from_name("vgg_transformer")
    config["device"] = "cpu"
    config["predictor"]["beamsearch"] = False

    recognizer = Predictor(config)

    pages = []

    for page_number, image_path in images:
        detection_result = detector.readtext(
            str(image_path),
            detail=1,
            paragraph=False,
        )

        image = cv2.imread(str(image_path))
        lines = []

        for box, _easy_text, easy_score in detection_result:
            crop = crop_box(image, box)

            if crop.size == 0:
                continue

            pil_image = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
            text = recognizer.predict(pil_image)

            lines.append({
                "text": text,
                "confidence": float(easy_score),
                "bbox": box,
            })

        pages.append({
            "page": page_number,
            "text": "\n".join(line["text"] for line in lines),
            "blocks": lines,
        })

    return pages


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/ocr/test-engines")
async def test_engines(
    file: UploadFile = File(...),
    max_pages: int = Form(2),
    dpi: int = Form(180),
):
    started = time.time()

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        pdf_path = temp_path / file.filename

        pdf_path.write_bytes(await file.read())

        total_pages, images = render_pdf(
            pdf_path=pdf_path,
            dpi=dpi,
            max_pages=max_pages,
        )

        results = {}

        for engine in ["paddle", "easyocr", "vietocr"]:
            engine_started = time.time()

            try:
                if engine == "paddle":
                    pages = run_paddle(images)
                elif engine == "easyocr":
                    pages = run_easyocr(images)
                else:
                    pages = run_vietocr(images)

                text = "\n\n".join(
                    f"===== PAGE {page['page']} =====\n{page['text']}"
                    for page in pages
                )

                results[engine] = {
                    "success": True,
                    "seconds": round(time.time() - engine_started, 2),
                    "character_count": len(text),
                    "text_preview": text[:3000],
                    "pages": pages,
                }

            except Exception as exc:
                results[engine] = {
                    "success": False,
                    "seconds": round(time.time() - engine_started, 2),
                    "error": str(exc),
                }

        return {
            "success": True,
            "file": file.filename,
            "total_pdf_pages": total_pages,
            "tested_pages": len(images),
            "dpi": dpi,
            "seconds": round(time.time() - started, 2),
            "results": results,
        }
