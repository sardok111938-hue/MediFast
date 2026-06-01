export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type PaginationInput = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  rows: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export function normalizePage(value?: number) {
  const page = Math.trunc(Number(value ?? 1));

  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function normalizePageSize(value?: number) {
  const pageSize = Math.trunc(Number(value ?? DEFAULT_PAGE_SIZE));

  if (!Number.isFinite(pageSize) || pageSize <= 0) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(pageSize, MAX_PAGE_SIZE);
}

export function getPaginationRange(page: number, pageSize: number) {
  const safePage = normalizePage(page);
  const safePageSize = normalizePageSize(pageSize);
  const from = (safePage - 1) * safePageSize;

  return {
    from,
    to: from + safePageSize - 1,
  };
}

export function buildPaginatedResult<T>(
  rows: T[],
  totalCount: number | null | undefined,
  input: PaginationInput = {},
): PaginatedResult<T> {
  const page = normalizePage(input.page);
  const pageSize = normalizePageSize(input.pageSize);
  const count = totalCount ?? rows.length;

  return {
    rows,
    totalCount: count,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(count / pageSize)),
  };
}
