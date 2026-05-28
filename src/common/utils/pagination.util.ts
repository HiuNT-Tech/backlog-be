import { PaginatedResponse } from '@common/dto/response.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

type PagePaginationInput = {
  page?: number;
  limit?: number;
};

type OffsetPaginationInput = {
  skip?: number;
  limit?: number;
};

export type PagePagination = {
  page: number;
  limit: number;
  skip: number;
  take: number;
};

export type OffsetPagination = {
  skip: number;
  limit: number;
  take: number;
};

export const normalizeLimit = (
  limit: number | undefined,
  maxLimit = MAX_LIMIT,
): number => {
  const normalizedLimit = Math.max(limit ?? DEFAULT_LIMIT, 1);
  return Math.min(normalizedLimit, maxLimit);
};

export const getPagePagination = (
  input: PagePaginationInput,
  maxLimit = MAX_LIMIT,
): PagePagination => {
  const page = Math.max(input.page ?? DEFAULT_PAGE, 1);
  const limit = normalizeLimit(input.limit, maxLimit);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
};

export const getOffsetPagination = (
  input: OffsetPaginationInput,
  maxLimit = MAX_LIMIT,
): OffsetPagination => {
  const skip = Math.max(input.skip ?? 0, 0);
  const limit = normalizeLimit(input.limit, maxLimit);

  return {
    skip,
    limit,
    take: limit,
  };
};

export const toPaginatedResponse = <TItem>(
  items: TItem[],
  total: number,
): PaginatedResponse<TItem> => ({
  items,
  total,
});
