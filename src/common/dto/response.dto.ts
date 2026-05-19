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
  override requestId: string;
  statusCode: number;
  path: string;
  method: string;
  message: ApiErrorMessage;

  constructor(options: ApiErrorResponseOptions) {
    super({
      requestId: options.requestId,
    });
    this.requestId = options.requestId;
    this.statusCode = options.statusCode;
    this.path = options.path;
    this.method = options.method;
    this.message = options.message;
  }

  override toJSON(): {
    statusCode: number;
    requestId: string;
    path: string;
    method: string;
    message: ApiErrorMessage;
  } {
    return {
      statusCode: this.statusCode,
      requestId: this.requestId,
      path: this.path,
      method: this.method,
      message: this.message,
    };
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
