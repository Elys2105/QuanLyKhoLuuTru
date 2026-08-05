import { PdfWordOcrImportSection } from "@/features/imports/components/pdf-word-ocr-import-section";
import { ProfileImportCard } from "@/features/imports/components/profile-import-card";

function ExcelImportPageContent() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">
          Nhập liệu Excel
        </h2>

        <p className="text-sm text-muted-foreground">
          Import hồ sơ, vị trí lưu trữ và văn bản từ file Excel mẫu.
        </p>
      </div>

      <ProfileImportCard />
    </div>
  );
}

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <ExcelImportPageContent />
      <PdfWordOcrImportSection />
    </div>
  );
}

