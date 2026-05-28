import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  CountedResponse,
  ItemResponse,
  PaginatedResponse,
} from '@common/dto/response.dto';

type ApiResponse<T> =
  T extends PaginatedResponse<infer TItem>
    ? PaginatedResponse<TItem>
    : T extends CountedResponse<infer TItem>
      ? CountedResponse<TItem>
      : ItemResponse<T>;

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(map((data) => this.toResponse(data)));
  }

  private toResponse(data: T): ApiResponse<T> {
    if (this.isPaginatedResponse(data)) {
      return data as ApiResponse<T>;
    }

    if (this.isCountedResponse(data)) {
      return data as ApiResponse<T>;
    }

    return {
      item: data,
    } as ApiResponse<T>;
  }

  private isPaginatedResponse(
    value: unknown,
  ): value is PaginatedResponse<unknown> {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const response = value as Record<string, unknown>;
    return Array.isArray(response.items) && typeof response.total === 'number';
  }

  private isCountedResponse(value: unknown): value is CountedResponse<unknown> {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const response = value as Record<string, unknown>;
    return Array.isArray(response.items) && typeof response.count === 'number';
  }
}
