import { addDaysToToday, toIsoString } from './date.util';

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

  describe('addDaysToToday', () => {
    it('should normalize the result to midnight UTC', () => {
      const result = addDaysToToday(0);

      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
    });

    it('should move forward for a positive offset and backward for a negative one', () => {
      const today = addDaysToToday(0).getTime();
      const dayMs = 24 * 60 * 60 * 1000;

      expect(addDaysToToday(3).getTime()).toBe(today + 3 * dayMs);
      expect(addDaysToToday(-2).getTime()).toBe(today - 2 * dayMs);
    });

    it('should roll over month boundaries', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-30T10:30:00.000Z'));

      expect(addDaysToToday(3).toISOString()).toBe('2026-02-02T00:00:00.000Z');
      expect(addDaysToToday(-30).toISOString()).toBe(
        '2025-12-31T00:00:00.000Z',
      );

      jest.useRealTimers();
    });
  });
});
