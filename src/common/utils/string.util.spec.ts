import { normalizeString, normalizeEmail } from './string.util';

describe('string.util', () => {
  describe('normalizeString', () => {
    it('should trim and collapse spaces', () => {
      expect(normalizeString('  a  b  ')).toBe('a b');
    });

    it('should collapse tabs and newlines into a single space', () => {
      expect(normalizeString('a\t\nb')).toBe('a b');
    });
  });

  describe('normalizeEmail', () => {
    it('should trim and lowercase the email', () => {
      expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
    });
  });
});
