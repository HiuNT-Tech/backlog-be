import { HttpStatus } from '@nestjs/common';
import { ERROR_MESSAGES } from '@common/constants/error-code.constant';
import { BusinessException } from './business.exception';
import { ErrorCode } from './error-code';

describe('BusinessException', () => {
  it('should expose errorCode and default message from ERROR_MESSAGES', () => {
    const exception = new BusinessException(ErrorCode.USER_NOT_FOUND);

    expect(exception.getResponse()).toEqual({
      errorCode: ErrorCode.USER_NOT_FOUND,
      message: ERROR_MESSAGES[ErrorCode.USER_NOT_FOUND],
    });
  });

  it('should default the status to 400 BAD_REQUEST', () => {
    const exception = new BusinessException(ErrorCode.INVALID_TOKEN);

    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('should use the provided status code', () => {
    const exception = new BusinessException(
      ErrorCode.INVALID_CREDENTIALS,
      HttpStatus.UNAUTHORIZED,
    );

    expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('should allow overriding the message', () => {
    const exception = new BusinessException(
      ErrorCode.USER_EMAIL_EXISTS,
      HttpStatus.CONFLICT,
      'Custom message',
    );

    expect(exception.getResponse()).toEqual({
      errorCode: ErrorCode.USER_EMAIL_EXISTS,
      message: 'Custom message',
    });
  });
});
