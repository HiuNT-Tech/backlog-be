import { RequestTimeoutException } from '@nestjs/common';
import { Observable, lastValueFrom, of, throwError } from 'rxjs';
import { TimeoutInterceptor } from './timeout.interceptor';

describe('TimeoutInterceptor', () => {
  let interceptor: TimeoutInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TimeoutInterceptor();
  });

  it('should pass through the value when the handler resolves in time', async () => {
    const next = { handle: () => of('ok') };

    const result = await lastValueFrom(
      interceptor.intercept({} as any, next as any),
    );

    expect(result).toBe('ok');
  });

  it('should propagate a non-timeout error from the handler unchanged', async () => {
    const boom = new Error('boom');
    const next = { handle: () => throwError(() => boom) };

    await expect(
      lastValueFrom(interceptor.intercept({} as any, next as any)),
    ).rejects.toBe(boom);
  });

  it('should throw RequestTimeoutException when the handler exceeds the timeout', async () => {
    jest.useFakeTimers();
    const next = {
      handle: () => new Observable<never>(() => {}),
    };

    const resultPromise = lastValueFrom(
      interceptor.intercept({} as any, next as any),
    );
    const assertion = expect(resultPromise).rejects.toBeInstanceOf(
      RequestTimeoutException,
    );

    await jest.advanceTimersByTimeAsync(30_000);
    await assertion;
    jest.useRealTimers();
  });
});
