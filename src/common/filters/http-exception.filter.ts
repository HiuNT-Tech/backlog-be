import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ExceptionResponse = {
  message?: string | string[];
  error?: string;
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = exception.getStatus
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception.getResponse();
    const message = this.getMessage(exceptionResponse, exception.message);

    response.status(statusCode).json({
      success: false,
      statusCode,
      path: request.url,
      method: request.method,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private getMessage(
    exceptionResponse: string | object,
    fallback: string,
  ): string | string[] {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    const body = exceptionResponse as ExceptionResponse;
    return body.message ?? fallback;
  }
}
