import {
  normalizeLimit,
  getPagePagination,
  getOffsetPagination,
  toPaginatedResponse,
} from './pagination.util';

describe('pagination.util', () => {
  describe('normalizeLimit', () => {
    it('should default to 10 when undefined', () => {
      expect(normalizeLimit(undefined)).toBe(10);
    });

    it('should clamp to a minimum of 1', () => {
      expect(normalizeLimit(0)).toBe(1);
    });

    it('should clamp to the max limit (100)', () => {
      expect(normalizeLimit(999)).toBe(100);
    });

    it('should respect a custom max limit', () => {
      expect(normalizeLimit(50, 20)).toBe(20);
    });
  });

  describe('getPagePagination', () => {
    it('should default page to 1', () => {
      expect(getPagePagination({})).toMatchObject({ page: 1, limit: 10 });
    });

    it('should clamp page 0 to 1', () => {
      expect(getPagePagination({ page: 0 }).page).toBe(1);
    });

    it('should compute skip and take', () => {
      expect(getPagePagination({ page: 3, limit: 20 })).toMatchObject({
        page: 3,
        limit: 20,
        skip: 40,
        take: 20,
      });
    });
  });

  describe('getOffsetPagination', () => {
    it('should clamp a negative skip to 0', () => {
      expect(getOffsetPagination({ skip: -5 }).skip).toBe(0);
    });

    it('should clamp the limit', () => {
      expect(getOffsetPagination({ skip: 0, limit: 999 }).limit).toBe(100);
    });
  });

  describe('toPaginatedResponse', () => {
    it('should return items and total', () => {
      expect(toPaginatedResponse([1, 2], 5)).toEqual({
        items: [1, 2],
        total: 5,
      });
    });
  });
});
