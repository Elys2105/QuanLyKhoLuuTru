export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined) return "0";

  return new Intl.NumberFormat("vi-VN").format(value);
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size = size / 1024;
    unitIndex += 1;
  }

  const rounded = unitIndex === 0 ? size : Number(size.toFixed(2));

  return `${rounded} ${units[unitIndex]}`;
}

export function fallbackText(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

export function joinTextParts(
  parts: Array<string | number | null | undefined>,
  separator = " - ",
): string {
  const validParts = parts
    .filter((part) => part !== null && part !== undefined && part !== "")
    .map(String);

  return validParts.length ? validParts.join(separator) : "-";
}