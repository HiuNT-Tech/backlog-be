import { ErrorCode } from '@common/exceptions/error-code';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.USER_NOT_FOUND]: 'User not found',
  [ErrorCode.USER_EMAIL_EXISTS]: 'Email already exists',
  [ErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ErrorCode.FORBIDDEN_RESOURCE]: 'Forbidden resource',
};
