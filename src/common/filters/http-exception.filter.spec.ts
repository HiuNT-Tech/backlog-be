import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';
import { FileLogger } from '@common/logger';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let logger: MockProxy<FileLogger>;
  let json: jest.Mock;
  let status: jest.Mock;

  const makeHost = (
    req: Record<string, unknown>,
  ): ArgumentsHost => {
    const res = { status, json };
    return {
      switchToHttp: () => ({
        getResponse: () => res,
        getRequest: () => req,
      }),
    } as unknown as ArgumentsHost;
  };

  const baseReq = (over: Record<string, unknown> = {}) => ({
    url: '/v1/test',
    method: 'POST',
    headers: {},
    ...over,
  });

  beforeEach(() => {
    logger = mock<FileLogger>();
    filter = new HttpExceptionFilter(logger);
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
  });

  describe('catch', () => {
    it('should map a generic HttpException to its status and body', () => {
      filter.catch(
        new BadRequestException('Bad input'),
        makeHost(baseReq()),
      );

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const body = json.mock.calls[0][0];
      expect(body).toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
        path: '/v1/test',
        method: 'POST',
        message: 'Bad input',
      });
      expect(typeof body.requestId).toBe('string');
    });

    it('should include the errorCode for a BusinessException', () => {
      filter.catch(
        new BusinessException(
          ErrorCode.INVALID_CREDENTIALS,
          HttpStatus.UNAUTHORIZED,
        ),
        makeHost(baseReq()),
      );

      expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(json.mock.calls[0][0]).toMatchObject({
        errorCode: ErrorCode.INVALID_CREDENTIALS,
      });
    });

    it('should map an unknown error to 500 with a generic message and log error', () => {
      filter.catch(new Error('kaboom'), makeHost(baseReq()));

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(json.mock.calls[0][0]).toMatchObject({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
      expect(logger.error).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should log a warning (not error) for 4xx responses', () => {
      filter.catch(new BadRequestException('nope'), makeHost(baseReq()));

      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should reuse the x-request-id header when present', () => {
      filter.catch(
        new BadRequestException('x'),
        makeHost(baseReq({ headers: { 'x-request-id': 'req-123' } })),
      );

      expect(json.mock.calls[0][0].requestId).toBe('req-123');
    });

    it('should use the first value when x-request-id is an array', () => {
      filter.catch(
        new BadRequestException('x'),
        makeHost(baseReq({ headers: { 'x-request-id': ['req-a', 'req-b'] } })),
      );

      expect(json.mock.calls[0][0].requestId).toBe('req-a');
    });

    it('should generate a UUID requestId when no header is provided', () => {
      filter.catch(new BadRequestException('x'), makeHost(baseReq()));

      expect(json.mock.calls[0][0].requestId).toMatch(/^[0-9a-f-]{36}$/);
    });
  });
});
