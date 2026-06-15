import { toIsoString } from './date.util';

describe('date.util', () => {
  describe('toIsoString', () => {
    it('should convert a specific Date to its ISO string', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');
      expect(toIsoString(date)).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should use now when no date is provided', () => {
      expect(toIsoString()).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });
  });
});
