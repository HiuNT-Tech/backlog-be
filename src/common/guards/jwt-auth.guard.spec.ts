import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { mock, MockProxy } from 'jest-mock-extended';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: MockProxy<Reflector>;

  const makeContext = (): ExecutionContext =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = mock<Reflector>();
    guard = new JwtAuthGuard(reflector);
  });

  describe('canActivate', () => {
    it('should return true without delegating to passport for @Public routes', () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const parentCanActivate = jest.spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype) as { canActivate: unknown },
        'canActivate' as never,
      );

      expect(guard.canActivate(makeContext())).toBe(true);
      expect(parentCanActivate).not.toHaveBeenCalled();
    });

    it('should delegate to passport (super.canActivate) for protected routes', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const parentCanActivate = jest
        .spyOn(
          Object.getPrototypeOf(JwtAuthGuard.prototype) as {
            canActivate: () => boolean;
          },
          'canActivate' as never,
        )
        .mockReturnValue(true as never);

      const context = makeContext();
      expect(guard.canActivate(context)).toBe(true);
      expect(parentCanActivate).toHaveBeenCalledWith(context);
    });
  });

  describe('handleRequest', () => {
    it('should throw HttpException 410 GONE when the token is expired (info.name)', () => {
      expect(() =>
        guard.handleRequest(null, null, { name: 'TokenExpiredError' }),
      ).toThrow(
        expect.objectContaining({
          constructor: HttpException,
        }),
      );

      try {
        guard.handleRequest(null, null, { name: 'TokenExpiredError' });
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(HttpStatus.GONE);
      }
    });

    it('should throw HttpException 410 GONE when info.message is "jwt expired"', () => {
      try {
        guard.handleRequest(null, null, { message: 'jwt expired' });
        fail('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.GONE);
      }
    });

    it('should rethrow the provided error when present', () => {
      const err = new Error('boom');

      expect(() => guard.handleRequest(err, null, undefined)).toThrow(err);
    });

    it('should throw UnauthorizedException when there is no user and no error', () => {
      expect(() => guard.handleRequest(null, null, undefined)).toThrow(
        UnauthorizedException,
      );
    });

    it('should return the user when authenticated', () => {
      const user = { userId: 1 };

      expect(guard.handleRequest(null, user, undefined)).toBe(user);
    });
  });
});
