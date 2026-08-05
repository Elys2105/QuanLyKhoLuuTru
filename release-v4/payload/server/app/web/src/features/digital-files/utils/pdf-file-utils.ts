import type { DigitalFile } from "@/features/digital-files/types";

export const SUPPORTED_DIGITAL_FILE_ACCEPT =
  "application/pdf,.pdf,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/vnd.ms-excel,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx";

export const SUPPORTED_DIGITAL_FILE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
];

export function getFileExtensionFromName(fileName?: string | null): string {
  if (!fileName) return "";

  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex < 0) return "";

  return fileName.slice(dotIndex).toLowerCase();
}

export function getBrowserFileKind(file: File): "pdf" | "word" | "excel" | "unknown" {
  const extension = getFileExtensionFromName(file.name);
  const type = file.type;

  if (type === "application/pdf" || extension === ".pdf") {
    return "pdf";
  }

  if (
    type === "application/msword" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === ".doc" ||
    extension === ".docx"
  ) {
    return "word";
  }

  if (
    type === "application/vnd.ms-excel" ||
    type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    extension === ".xls" ||
    extension === ".xlsx"
  ) {
    return "excel";
  }

  return "unknown";
}

export function isSupportedDigitalUploadFile(file: File): boolean {
  return getBrowserFileKind(file) !== "unknown";
}

export function isPdfFile(file?: DigitalFile | null): boolean {
  if (!file) return false;

  return (
    file.is_pdf === true ||
    file.file_type === "pdf" ||
    file.mime_type === "application/pdf" ||
    getFileExtensionFromName(file.original_name || file.file) === ".pdf"
  );
}

export function isWordFile(file?: DigitalFile | null): boolean {
  if (!file) return false;

  const extension = getFileExtensionFromName(file.original_name || file.file);

  return (
    file.is_word === true ||
    file.file_type === "word" ||
    extension === ".doc" ||
    extension === ".docx"
  );
}

export function isExcelFile(file?: DigitalFile | null): boolean {
  if (!file) return false;

  const extension = getFileExtensionFromName(file.original_name || file.file);

  return (
    file.is_excel === true ||
    file.file_type === "excel" ||
    extension === ".xls" ||
    extension === ".xlsx"
  );
}

export function canPreviewDigitalFile(file?: DigitalFile | null): boolean {
  if (!file) return false;

  return file.can_preview_inline === true || isPdfFile(file);
}

export function getDigitalFileTypeLabel(file?: DigitalFile | null): string {
  if (!file) return "Không rõ";

  if (file.file_type_label) return file.file_type_label;
  if (isPdfFile(file)) return "PDF";
  if (isWordFile(file)) return "Word";
  if (isExcelFile(file)) return "Excel";

  return file.mime_type || "Không rõ";
}

export function getDigitalFileDisplayName(
  file?: DigitalFile | null,
): string {
  if (!file) return "Chưa chọn file";

  return file.original_name || file.file || `File #${file.id}`;
}

export function getDefaultDigitalFile(
  files: DigitalFile[],
): DigitalFile | null {
  if (files.length === 0) return null;

  const primaryFile = files.find((file) => file.is_primary);

  if (primaryFile) return primaryFile;

  const firstPdfFile = files.find((file) => canPreviewDigitalFile(file));

  return firstPdfFile || files[0];
}

export function sortDigitalFiles(files: DigitalFile[]): DigitalFile[] {
  return [...files].sort((firstFile, secondFile) => {
    if (firstFile.is_primary && !secondFile.is_primary) return -1;
    if (!firstFile.is_primary && secondFile.is_primary) return 1;

    if (canPreviewDigitalFile(firstFile) && !canPreviewDigitalFile(secondFile)) {
      return -1;
    }

    if (!canPreviewDigitalFile(firstFile) && canPreviewDigitalFile(secondFile)) {
      return 1;
    }

    return String(firstFile.id).localeCompare(String(secondFile.id));
  });
}


export function createBlobObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeBlobObjectUrl(objectUrl?: string | null): void {
  if (!objectUrl) return;

  URL.revokeObjectURL(objectUrl);
}
export function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}