import { ErrorCode } from '@common/exceptions/error-code';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.USER_NOT_FOUND]: 'User not found',
  [ErrorCode.USER_EMAIL_EXISTS]: 'Email already exists',
  [ErrorCode.USER_ALREADY_VERIFIED]: 'User already verified',
  [ErrorCode.USER_INACTIVE]: 'User account is inactive',
  [ErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ErrorCode.INVALID_TOKEN]: 'Invalid or expired token',
  [ErrorCode.INVALID_VERIFICATION_TOKEN]: 'Invalid verification token',
  [ErrorCode.VERIFICATION_TOKEN_MISSING]: 'Verification token is missing',
  [ErrorCode.EMAIL_SERVICE_UNAVAILABLE]: 'Email service is unavailable',
  [ErrorCode.FORBIDDEN_RESOURCE]: 'Forbidden resource',
};
