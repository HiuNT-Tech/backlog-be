import { ConfigService } from '@nestjs/config';
import {
  buildFrontendUrl,
  getAcceptInvitationUrl,
  getFrontendUrl,
  getRegisterInvitationUrl,
  getResetPasswordUrl,
  getVerificationUrl,
} from './url.util';

const makeConfigService = (frontendUrl: string): ConfigService =>
  ({
    getOrThrow: jest.fn().mockReturnValue(frontendUrl),
  }) as unknown as ConfigService;

describe('url.util', () => {
  describe('getFrontendUrl', () => {
    it('should strip trailing slashes from the configured frontend URL', () => {
      const config = makeConfigService('https://app.example.com///');
      expect(getFrontendUrl(config)).toBe('https://app.example.com');
    });

    it('should return the URL unchanged when there is no trailing slash', () => {
      const config = makeConfigService('https://app.example.com');
      expect(getFrontendUrl(config)).toBe('https://app.example.com');
    });
  });

  describe('buildFrontendUrl', () => {
    it('should append the path to the frontend base URL', () => {
      const config = makeConfigService('https://app.example.com/');
      expect(buildFrontendUrl(config, '/foo')).toBe(
        'https://app.example.com/foo',
      );
    });
  });

  describe('getAcceptInvitationUrl', () => {
    it('should build an invitations URL with the token', () => {
      const config = makeConfigService('https://app.example.com');
      expect(getAcceptInvitationUrl(config, 'tok-1')).toBe(
        'https://app.example.com/invitations/tok-1',
      );
    });
  });

  describe('getRegisterInvitationUrl', () => {
    it('should build a register URL with encoded token and email', () => {
      const config = makeConfigService('https://app.example.com');
      expect(
        getRegisterInvitationUrl(config, 'tok 1', 'user+1@example.com'),
      ).toBe(
        'https://app.example.com/register?invitationToken=tok%201&email=user%2B1%40example.com',
      );
    });
  });

  describe('getVerificationUrl', () => {
    it('should build a verification URL with encoded email and token', () => {
      const config = makeConfigService('https://app.example.com');
      expect(
        getVerificationUrl(config, 'user+1@example.com', 'tok 1'),
      ).toBe(
        'https://app.example.com/account/verification?email=user%2B1%40example.com&token=tok%201',
      );
    });
  });

  describe('getResetPasswordUrl', () => {
    it('should build a reset-password URL with encoded email and token', () => {
      const config = makeConfigService('https://app.example.com');
      expect(getResetPasswordUrl(config, 'user@example.com', 'tok-1')).toBe(
        'https://app.example.com/reset-password?email=user%40example.com&token=tok-1',
      );
    });
  });
});
