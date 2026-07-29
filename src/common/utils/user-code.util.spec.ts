import {
  buildUserCode,
  USER_CODE_DIGITS,
  USER_CODE_PREFIX,
} from './user-code.util';

describe('user-code.util', () => {
  describe('buildUserCode', () => {
    it('should pad small ids to the configured digit count', () => {
      expect(buildUserCode(1)).toBe('U-000001');
      expect(buildUserCode(42)).toBe('U-000042');
      expect(buildUserCode(999999)).toBe('U-999999');
    });

    it('should keep every digit of ids beyond the padding width instead of truncating', () => {
      // Cắt bớt sẽ làm 2 user khác nhau ra cùng mã, phá vỡ unique constraint.
      expect(buildUserCode(1000000)).toBe('U-1000000');
      expect(buildUserCode(12345678)).toBe('U-12345678');
    });

    it('should produce a distinct code for every distinct id', () => {
      const ids = [1, 2, 10, 100, 999999, 1000000];
      const codes = ids.map(buildUserCode);

      expect(new Set(codes).size).toBe(ids.length);
    });

    it('should always start with the prefix and match the documented shape', () => {
      const code = buildUserCode(7);

      expect(code.startsWith(USER_CODE_PREFIX)).toBe(true);
      expect(code).toMatch(
        new RegExp(`^${USER_CODE_PREFIX}\\d{${USER_CODE_DIGITS},}$`),
      );
    });
  });
});
