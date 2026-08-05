from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

output_path = "ocr-test-paddle.pdf"

c = canvas.Canvas(output_path, pagesize=A4)
c.setFont("Helvetica", 14)

c.drawString(72, 780, "OCR TEST DOCUMENT")
c.drawString(72, 750, "Bao cao cong tac dan toc nam 2026")
c.drawString(72, 720, "Ho so nay dung de kiem tra PaddleOCR")
c.drawString(72, 690, "Ma ho so: OCR-PADDLE-001")
c.drawString(72, 660, "Tu khoa dac biet: luu tru dien tu")

c.save()

print(output_path)
