import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BoardMemberRole } from '@prisma/client';
import { Request } from 'express';
import { BOARD_ROLES_KEY } from '@common/constants/app.constant';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';
import { BoardAccessService } from '../board-access.service';

/**
 * Validates board membership/role for routes decorated with `@BoardRoles()` or
 * `@BoardMember()`. The board is taken from the `:id` route param, so this guard
 * only applies to `boards/:id/...` style endpoints.
 *
 * Runs after the global `JwtAuthGuard`, so `request.user` is already populated.
 * Routes without the metadata are passed through untouched.
 */
@Injectable()
export class BoardRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly boardAccessService: BoardAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<BoardMemberRole[]>(
      BOARD_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Route is not board-scoped: nothing to enforce.
    if (roles === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new BusinessException(
        ErrorCode.INVALID_TOKEN,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const boardId = Number(request.params.id);

    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new BusinessException(
        ErrorCode.BOARD_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (roles.length === 0) {
      await this.boardAccessService.ensureMember(boardId, user.userId);
    } else {
      await this.boardAccessService.ensureRole(boardId, user.userId, roles);
    }

    return true;
  }
}
