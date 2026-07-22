import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { mock, MockProxy } from 'jest-mock-extended';
import { BusinessException } from '@common/exceptions/business.exception';
import { HttpStatus } from '@nestjs/common';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let jwtService: MockProxy<JwtService>;
  let configService: MockProxy<ConfigService>;
  let service: TokenService;

  const payload = { userId: 1, email: 'user@example.com' };

  beforeEach(() => {
    jwtService = mock<JwtService>();
    configService = mock<ConfigService>();
    service = new TokenService(jwtService, configService);
  });

  describe('signAccessToken', () => {
    it('should sign with the access secret and expiresIn from config', async () => {
      configService.getOrThrow.mockImplementation((key: string) => {
        const map: Record<string, string> = {
          'jwt.accessSecret': 'access-secret',
          'jwt.accessExpiresIn': '15m',
        };
        return map[key];
      });
      jwtService.signAsync.mockResolvedValue('signed-access-token');

      const result = await service.signAccessToken(payload);

      expect(result).toBe('signed-access-token');
      expect(jwtService.signAsync).toHaveBeenCalledWith(payload, {
        secret: 'access-secret',
        expiresIn: '15m',
      });
    });
  });

  describe('signRefreshToken', () => {
    it('should sign with the refresh secret and expiresIn from config', async () => {
      configService.getOrThrow.mockImplementation((key: string) => {
        const map: Record<string, string> = {
          'jwt.refreshSecret': 'refresh-secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return map[key];
      });
      jwtService.signAsync.mockResolvedValue('signed-refresh-token');

      const result = await service.signRefreshToken(payload);

      expect(result).toBe('signed-refresh-token');
      expect(jwtService.signAsync).toHaveBeenCalledWith(payload, {
        secret: 'refresh-secret',
        expiresIn: '7d',
      });
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify the token using the refresh secret', async () => {
      configService.getOrThrow.mockReturnValue('refresh-secret');
      jwtService.verifyAsync.mockResolvedValue(payload);

      const result = await service.verifyRefreshToken('some-token');

      expect(result).toEqual(payload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('some-token', {
        secret: 'refresh-secret',
      });
      expect(configService.getOrThrow).toHaveBeenCalledWith(
        'jwt.refreshSecret',
      );
    });

    it('should propagate the error when verification fails', async () => {
      configService.getOrThrow.mockReturnValue('refresh-secret');
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

      await expect(service.verifyRefreshToken('bad-token')).rejects.toThrow(
        'invalid token',
      );
    });
  });

  describe('hashToken', () => {
    it('should return a deterministic sha256 hex digest', () => {
      const expected = createHash('sha256').update('my-token').digest('hex');

      expect(service.hashToken('my-token')).toBe(expected);
    });

    it('should return a 64-character hex string', () => {
      const hash = service.hashToken('my-token');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should return different hashes for different inputs', () => {
      expect(service.hashToken('token-a')).not.toBe(
        service.hashToken('token-b'),
      );
    });

    it('should return the same hash for the same input', () => {
      expect(service.hashToken('same-token')).toBe(
        service.hashToken('same-token'),
      );
    });
  });

  describe('getTokenExpiresAt', () => {
    it('should return the Date derived from the exp claim', () => {
      const exp = 1_700_000_000;
      jwtService.decode.mockReturnValue({ exp });

      const result = service.getTokenExpiresAt('some-token');

      expect(result).toEqual(new Date(exp * 1000));
    });

    it('should throw BusinessException with UNAUTHORIZED when exp is missing', () => {
      jwtService.decode.mockReturnValue({});

      expect(() => service.getTokenExpiresAt('some-token')).toThrow(
        BusinessException,
      );
      try {
        service.getTokenExpiresAt('some-token');
        fail('expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(BusinessException);
        expect((err as BusinessException).getStatus()).toBe(
          HttpStatus.UNAUTHORIZED,
        );
      }
    });

    it('should throw BusinessException with UNAUTHORIZED when decode returns null', () => {
      jwtService.decode.mockReturnValue(null);

      expect(() => service.getTokenExpiresAt('some-token')).toThrow(
        BusinessException,
      );
    });
  });
});
