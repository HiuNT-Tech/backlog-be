import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_MESSAGES } from '@common/constants/error-code.constant';
import { ErrorCode } from './error-code';

export class BusinessException extends HttpException {
  constructor(
    errorCode: ErrorCode,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    message = ERROR_MESSAGES[errorCode],
  ) {
    super(
      {
        errorCode,
        message,
      },
      statusCode,
    );
  }
}
