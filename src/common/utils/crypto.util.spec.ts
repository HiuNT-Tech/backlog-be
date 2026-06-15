import {
  hashPassword,
  comparePassword,
  generateRandomToken,
} from './crypto.util';

describe('crypto.util', () => {
  describe('hashPassword', () => {
    it('should return a bcrypt hash different from the plaintext', async () => {
      const hash = await hashPassword('secret123');
      expect(hash).not.toBe('secret123');
      expect(hash).toMatch(/^\$2[ab]\$/);
    });
  });

  describe('comparePassword', () => {
    it('should return true for the matching password', async () => {
      const hash = await hashPassword('secret123');
      expect(await comparePassword('secret123', hash)).toBe(true);
    });

    it('should return false for a wrong password', async () => {
      const hash = await hashPassword('secret123');
      expect(await comparePassword('wrong', hash)).toBe(false);
    });
  });

  describe('generateRandomToken', () => {
    it('should generate a UUID v4 string', () => {
      const token = generateRandomToken();
      expect(token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('should generate a different token each call', () => {
      expect(generateRandomToken()).not.toBe(generateRandomToken());
    });
  });
});
