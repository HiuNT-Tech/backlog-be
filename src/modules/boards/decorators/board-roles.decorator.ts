import { SetMetadata } from '@nestjs/common';
import { BoardMemberRole } from '@prisma/client';
import { BOARD_ROLES_KEY } from '@common/constants/app.constant';

/**
 * Requires the caller to be an active member of the board (identified by the
 * `:id` route param) holding one of the given roles. Enforced by
 * {@link BoardRolesGuard}.
 */
export const BoardRoles = (...roles: BoardMemberRole[]) =>
  SetMetadata<string, BoardMemberRole[]>(BOARD_ROLES_KEY, roles);

/**
 * Requires the caller to be an active member of the board (any role).
 */
export const BoardMember = () =>
  SetMetadata<string, BoardMemberRole[]>(BOARD_ROLES_KEY, []);
