export interface PaginationMeta {
  page?: number;
  page_size?: number;
  total?: number;
  total_pages?: number;
  count?: number;
  next?: string | null;
  previous?: string | null;
}

export interface PaginatedData<T> {
  results: T[];
  pagination?: PaginationMeta;
  count?: number;
  next?: string | null;
  previous?: string | null;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface ListQueryParams extends PaginationParams {
  q?: string;
  search?: string;
  ordering?: string;
}

export function getTotalItems(meta?: PaginationMeta | null): number {
  if (!meta) return 0;
  return meta.total ?? meta.count ?? 0;
}

export function getCurrentPage(meta?: PaginationMeta | null): number {
  if (!meta) return 1;
  return meta.page ?? 1;
}

export function getPageSize(meta?: PaginationMeta | null): number {
  if (!meta) return 20;
  return meta.page_size ?? 20;
}

export function getTotalPages(meta?: PaginationMeta | null): number {
  if (!meta) return 1;

  if (meta.total_pages) {
    return meta.total_pages;
  }

  const total = getTotalItems(meta);
  const pageSize = getPageSize(meta);

  if (!total || !pageSize) {
    return 1;
  }

  return Math.max(1, Math.ceil(total / pageSize));
}