import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  const run = async (data: unknown) => {
    const interceptor = new ResponseInterceptor();
    const next: CallHandler = { handle: () => of(data) };
    return lastValueFrom(
      interceptor.intercept({} as ExecutionContext, next),
    );
  };

  describe('intercept', () => {
    it('should wrap a plain object into { item } when not paginated/counted', async () => {
      await expect(run({ id: 1 })).resolves.toEqual({ item: { id: 1 } });
    });

    it('should wrap null into { item: null }', async () => {
      await expect(run(null)).resolves.toEqual({ item: null });
    });

    it('should wrap a primitive into { item }', async () => {
      await expect(run('hello')).resolves.toEqual({ item: 'hello' });
    });

    it('should pass a paginated response { items, total } through unchanged', async () => {
      const paginated = { items: [1, 2], total: 2 };
      await expect(run(paginated)).resolves.toBe(paginated);
    });

    it('should pass a counted response { items, count } through unchanged', async () => {
      const counted = { items: [], count: 0 };
      await expect(run(counted)).resolves.toBe(counted);
    });

    it('should wrap an object that has items but no numeric total/count', async () => {
      const data = { items: [1], total: 'oops' };
      await expect(run(data)).resolves.toEqual({ item: data });
    });
  });
});
