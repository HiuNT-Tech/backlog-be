import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ApiErrorResponseDto } from '@common/dto/response.dto';
import { FileLogger } from '@common/logger';

type ExceptionResponse = {
  message?: string | string[];
  error?: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter<unknown> {
  constructor(private readonly logger: FileLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const timestamp = new Date().toISOString();
    const requestId = this.getRequestId(request);
    const statusCode = this.getStatusCode(exception);
    const message = this.getMessage(exception);

    this.logException({
      exception,
      request,
      requestId,
      statusCode,
      message,
      timestamp,
    });

    response.status(statusCode).json(
      new ApiErrorResponseDto({
        statusCode,
        requestId,
        path: request.url,
        method: request.method,
        message,
        timestamp,
      }),
    );
  }

  private getRequestId(request: Request): string {
    const requestId = request.headers['x-request-id'];

    if (Array.isArray(requestId)) {
      return requestId[0] ?? randomUUID();
    }

    return requestId ?? randomUUID();
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getMessage(exception: unknown): string | string[] {
    if (!(exception instanceof HttpException)) {
      return 'Internal server error';
    }

    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    const body = exceptionResponse as ExceptionResponse;
    return body.message ?? exception.message;
  }

  private logException(input: {
    exception: unknown;
    request: Request;
    requestId: string;
    statusCode: number;
    message: string | string[];
    timestamp: string;
  }): void {
    const logPayload = {
      requestId: input.requestId,
      timestamp: input.timestamp,
      statusCode: input.statusCode,
      method: input.request.method,
      path: input.request.url,
      message: input.message,
      errorName: this.getErrorName(input.exception),
    };
    const stack = this.getStack(input.exception);

    if (input.statusCode >= 500) {
      this.logger.error(logPayload, stack, HttpExceptionFilter.name);
      return;
    }

    this.logger.warn(logPayload, HttpExceptionFilter.name);
  }

  private getErrorName(exception: unknown): string | undefined {
    if (exception instanceof Error) {
      return exception.name;
    }

    return undefined;
  }

  private getStack(exception: unknown): string | undefined {
    if (exception instanceof Error) {
      return exception.stack;
    }

    return undefined;
  }
}
