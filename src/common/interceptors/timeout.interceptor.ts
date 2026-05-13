import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { DEFAULT_REQUEST_TIMEOUT_MS } from '@common/constants/app.constant';

@Injectable()
export class TimeoutInterceptor<T> implements NestInterceptor<T, T> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<T> {
    return next.handle().pipe(
      timeout({
        first: DEFAULT_REQUEST_TIMEOUT_MS,
        with: () => throwError(() => new RequestTimeoutException()),
      }),
    );
  }
}
