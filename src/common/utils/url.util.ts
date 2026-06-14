import { ConfigService } from '@nestjs/config';
import { ConfigKey } from '@common/enums/config-key.enum';

/**
 * Returns the frontend base URL with trailing slashes removed.
 */
export function getFrontendUrl(configService: ConfigService): string {
  return configService
    .getOrThrow<string>(ConfigKey.APP_FRONTEND_URL)
    .replace(/\/+$/, '');
}

/**
 * Builds a full frontend URL by appending the given path to the frontend base URL.
 */
export function buildFrontendUrl(
  configService: ConfigService,
  path: string,
): string {
  return `${getFrontendUrl(configService)}${path}`;
}

// ── Board Invitation URLs ──────────────────────────────────────────────

export function getAcceptInvitationUrl(
  configService: ConfigService,
  token: string,
): string {
  return buildFrontendUrl(configService, `/invitations/${token}`);
}

export function getRegisterInvitationUrl(
  configService: ConfigService,
  token: string,
  email: string,
): string {
  return buildFrontendUrl(
    configService,
    `/register?invitationToken=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
  );
}

// ── Auth Verification URL ──────────────────────────────────────────────

export function getVerificationUrl(
  configService: ConfigService,
  email: string,
  verifyToken: string,
): string {
  return buildFrontendUrl(
    configService,
    `/account/verification?email=${encodeURIComponent(email)}&token=${encodeURIComponent(verifyToken)}`,
  );
}

export function getResetPasswordUrl(
  configService: ConfigService,
  email: string,
  resetToken: string,
): string {
  return buildFrontendUrl(
    configService,
    `/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(resetToken)}`,
  );
}
