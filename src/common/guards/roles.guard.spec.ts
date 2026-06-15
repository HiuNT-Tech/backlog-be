import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { mock, MockProxy } from 'jest-mock-extended';
import { Role } from '@common/enums/role.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: MockProxy<Reflector>;

  const makeContext = (user: unknown): ExecutionContext =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = mock<Reflector>();
    guard = new RolesGuard(reflector);
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      expect(guard.canActivate(makeContext({ role: Role.USER }))).toBe(true);
    });

    it('should allow access when the required roles array is empty', () => {
      reflector.getAllAndOverride.mockReturnValue([]);

      expect(guard.canActivate(makeContext({ role: Role.USER }))).toBe(true);
    });

    it('should allow access when the user role is in the required roles', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

      expect(guard.canActivate(makeContext({ role: Role.ADMIN }))).toBe(true);
    });

    it('should throw ForbiddenException when the user role is not allowed', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

      expect(() => guard.canActivate(makeContext({ role: Role.USER }))).toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when there is no user on the request', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.USER]);

      expect(() => guard.canActivate(makeContext(undefined))).toThrow(
        ForbiddenException,
      );
    });
  });
});
