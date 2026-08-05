from pathlib import Path
import re

settings = Path(r"D:\archive-management\api\config\settings.py")
text = settings.read_text(encoding="utf-8")

mw = '"config.middleware.JsonUtf8CharsetMiddleware"'

if "DEFAULT_CHARSET" not in text:
    text += '\n\nDEFAULT_CHARSET = "utf-8"\n'
else:
    text = re.sub(
        r'DEFAULT_CHARSET\s*=\s*["\'][^"\']+["\']',
        'DEFAULT_CHARSET = "utf-8"',
        text,
    )

if "config.middleware.JsonUtf8CharsetMiddleware" not in text:
    m = re.search(r"(MIDDLEWARE\s*=\s*\[)(.*?)(\])", text, flags=re.S)
    if not m:
        raise SystemExit("Không tìm thấy MIDDLEWARE = [...]")

    body = m.group(2).rstrip()
    if body.strip() and not body.endswith(","):
        body += ","
    body += "\n    " + mw + ",\n"

    text = text[:m.start(2)] + body + text[m.end(2):]

settings.write_text(text, encoding="utf-8")
print("SETTINGS OK:", settings)
