import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

type ApiResponseOptions = {
  requestId?: string;
};

type ApiErrorMessage = string | string[];

type ApiErrorResponseOptions = {
  statusCode: number;
  path: string;
  method: string;
  message: ApiErrorMessage;
  requestId: string;
  timestamp?: string;
  errorCode?: string;
};

export class ApiResponseDto {
  requestId?: string;

  constructor(options: ApiResponseOptions) {
    this.requestId = options.requestId;
  }

  toJSON(): {
    requestId?: string;
  } {
    const response: {
      requestId?: string;
    } = {};

    if (this.requestId) {
      response.requestId = this.requestId;
    }

    return response;
  }
}

export class ApiSuccessResponseDto<T> extends ApiResponseDto {
  item: T;

  constructor(item: T, options: ApiResponseOptions = {}) {
    super({
      requestId: options.requestId,
    });
    this.item = item;
  }

  override toJSON(): {
    item: T;
    requestId?: string;
  } {
    const response: {
      item: T;
      requestId?: string;
    } = {
      item: this.item,
    };

    if (this.requestId) {
      response.requestId = this.requestId;
    }

    return response;
  }
}

export class ApiErrorResponseDto extends ApiResponseDto {
  @ApiProperty({ example: '4f8a8f2b-4b9e-4a5a-9e14-4c8143dd0bb9' })
  override requestId: string;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: '/v1/auth/login' })
  path: string;

  @ApiProperty({ example: 'POST' })
  method: string;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'Invalid credentials' },
      { type: 'array', items: { type: 'string' } },
    ],
  })
  message: ApiErrorMessage;

  @ApiPropertyOptional({ example: 'INVALID_CREDENTIALS' })
  errorCode?: string;

  constructor(options: ApiErrorResponseOptions) {
    super({
      requestId: options.requestId,
    });
    this.requestId = options.requestId;
    this.statusCode = options.statusCode;
    this.path = options.path;
    this.method = options.method;
    this.message = options.message;
    this.errorCode = options.errorCode;
  }

  override toJSON(): {
    statusCode: number;
    requestId: string;
    path: string;
    method: string;
    message: ApiErrorMessage;
    errorCode?: string;
  } {
    const response: {
      statusCode: number;
      requestId: string;
      path: string;
      method: string;
      message: ApiErrorMessage;
      errorCode?: string;
    } = {
      statusCode: this.statusCode,
      requestId: this.requestId,
      path: this.path,
      method: this.method,
      message: this.message,
    };

    if (this.errorCode) {
      response.errorCode = this.errorCode;
    }

    return response;
  }
}

export class ResponseDto<T> extends ApiSuccessResponseDto<T> {}

export type ItemResponse<T> = {
  item: T;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
};
