import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BoardMemberRole, Prisma } from '@prisma/client';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';
import { generateRandomToken } from '@common/utils/crypto.util';
import { normalizeEmail } from '@common/utils/string.util';
import {
  getAcceptInvitationUrl,
  getRegisterInvitationUrl,
} from '@common/utils/url.util';
import { EMAIL_PROVIDER, EmailProvider } from '@/providers/brevo.provider';
import { JwtPayload } from '@/types/jwt-payload.type';
import { BoardMembersService } from '@modules/board-members/board-members.service';
import { BoardAccessService } from '@modules/boards/board-access.service';
import { BoardsService } from '@modules/boards/boards.service';
import { UsersService } from '@modules/users/users.service';
import {
  CreateInvitationDto,
  ListBoardInvitationsQueryDto,
} from './dto/create-invitation.dto';
import { InvitationResponseDto } from './dto/invitation-response.dto';
import {
  InvitationRecord,
  InvitationsRepository,
} from './repositories/invitations.repository';
import { InvitationStatus } from '@common/enums/invitation.enum';

const boardManagerRoles = [BoardMemberRole.ADMIN, BoardMemberRole.PM];
const invitationTtlMs = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class InvitationsService {
  constructor(
    private readonly invitationsRepository: InvitationsRepository,
    private readonly boardAccessService: BoardAccessService,
    private readonly boardMembersService: BoardMembersService,
    private readonly boardsService: BoardsService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
  ) {}

  async createForBoard(
    user: JwtPayload,
    boardId: number,
    dto: CreateInvitationDto,
  ): Promise<InvitationResponseDto> {
    await this.boardAccessService.ensureRole(
      boardId,
      user.userId,
      boardManagerRoles,
    );

    const [board, inviter] = await Promise.all([
      this.boardsService.findById(boardId),
      this.usersService.findByIdForAuth(user.userId),
    ]);

    if (!board) {
      throw new BusinessException(
        ErrorCode.BOARD_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!inviter) {
      throw new BusinessException(
        ErrorCode.USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const email = normalizeEmail(dto.email);
    await this.ensureEmailIsNotActiveMember(boardId, email);
    const invitee = await this.usersService.findByEmail(email);
    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + invitationTtlMs);

    const invitation = await this.handleInvitationConflict(() =>
      this.invitationsRepository.create({
        boardId,
        email,
        inviteeUserId: invitee?.isActive ? invitee.id : null,
        invitedByUserId: inviter.id,
        role: dto.role,
        token,
        expiresAt,
      }),
    );

    const invitationUrl =
      invitee?.isActive === true
        ? getAcceptInvitationUrl(this.configService, token)
        : getRegisterInvitationUrl(this.configService, token, email);

    await this.emailProvider.sendEmail(
      email,
      `Backlog: You have been invited to join "${board.title}"`,
      `
        <p>Hi,</p>
        <p><strong>${inviter.displayName ?? inviter.email}</strong> has invited you to join the board <strong>${board.title}</strong> as <strong>${dto.role}</strong>.</p>
        <p><a href="${invitationUrl}">Open invitation</a></p>
        <p>This invitation will expire in 7 days.</p>
      `,
    );

    return this.toInvitationResponse(invitation);
  }

  async listForBoard(
    user: JwtPayload,
    boardId: number,
    query: ListBoardInvitationsQueryDto,
  ): Promise<InvitationResponseDto[]> {
    await this.boardAccessService.ensureRole(
      boardId,
      user.userId,
      boardManagerRoles,
    );
    await this.invitationsRepository.expirePendingForBoard(boardId);

    const invitations = await this.invitationsRepository.findByBoard(
      boardId,
      query.status,
    );

    return invitations.map((invitation) =>
      this.toInvitationResponse(invitation),
    );
  }

  async revoke(
    user: JwtPayload,
    boardId: number,
    invitationId: number,
  ): Promise<InvitationResponseDto> {
    const board = await this.boardsService.findById(boardId);
    if (!board) {
      throw new BusinessException(
        ErrorCode.BOARD_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    await this.boardAccessService.ensureRole(
      boardId,
      user.userId,
      boardManagerRoles,
    );

    const invitation = await this.invitationsRepository.findById(invitationId);
    if (!invitation) {
      throw new BusinessException(
        ErrorCode.INVITATION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.invitationsRepository.delete(invitationId);

    return this.toInvitationResponse(invitation);
  }

  async findByToken(token: string): Promise<InvitationResponseDto> {
    const invitation = await this.invitationsRepository.findByToken(token);
    if (!invitation) {
      throw new BusinessException(
        ErrorCode.INVITATION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    const board = await this.boardsService.findById(invitation.boardId);
    if (!board) {
      throw new BusinessException(
        ErrorCode.BOARD_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    return this.toInvitationResponse(invitation);
  }

  async accept(
    user: JwtPayload,
    token: string,
  ): Promise<InvitationResponseDto> {
    const invitation = await this.invitationsRepository.findByToken(token);
    if (!invitation) {
      throw new BusinessException(
        ErrorCode.INVITATION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    this.ensureInvitationBelongsToUser(invitation, user);

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BusinessException(
        ErrorCode.INVITATION_INVALID_OR_EXPIRED,
        HttpStatus.FORBIDDEN,
      );
    }

    if (invitation.expiresAt < new Date()) {
      await this.invitationsRepository.markExpired(invitation.id);
      throw new BusinessException(
        ErrorCode.INVITATION_INVALID_OR_EXPIRED,
        HttpStatus.FORBIDDEN,
      );
    }

    const accepted = await this.invitationsRepository.accept(
      invitation,
      user.userId,
    );

    if (!accepted) {
      throw new BusinessException(
        ErrorCode.INVITATION_INVALID_OR_EXPIRED,
        HttpStatus.FORBIDDEN,
      );
    }

    return this.toInvitationResponse(accepted);
  }

  private ensureInvitationBelongsToUser(
    invitation: InvitationRecord,
    user: JwtPayload,
  ): void {
    // Invitation already bound to a registered user: the acceptor must be them.
    if (invitation.inviteeUserId !== null) {
      if (invitation.inviteeUserId !== user.userId) {
        throw new BusinessException(
          ErrorCode.INVITATION_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }
      return;
    }

    if (normalizeEmail(invitation.email) !== normalizeEmail(user.email)) {
      throw new BusinessException(
        ErrorCode.INVITATION_EMAIL_MISMATCH,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async decline(
    user: JwtPayload,
    token: string,
  ): Promise<InvitationResponseDto> {
    // TODO
    throw new Error('Not implemented');
  }

  async listMine(user: JwtPayload): Promise<InvitationResponseDto[]> {
    // TODO
    throw new Error('Not implemented');
  }

  async bindPendingByEmail(user: {
    id: number;
    email: string;
    isActive: boolean;
  }): Promise<number> {
    // TODO
    throw new Error('Not implemented');
  }

  private async ensureEmailIsNotActiveMember(
    boardId: number,
    email: string,
  ): Promise<void> {
    const activeMember = await this.boardMembersService.getActiveMemberByEmail(
      boardId,
      email,
    );

    if (activeMember) {
      throw new BusinessException(
        ErrorCode.USER_ALREADY_MEMBER,
        HttpStatus.CONFLICT,
      );
    }
  }

  private async handleInvitationConflict<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BusinessException(
          ErrorCode.INVITATION_ALREADY_PENDING,
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }
  }

  private toInvitationResponse(
    invitation: InvitationRecord,
  ): InvitationResponseDto {
    return {
      id: invitation.id,
      boardId: invitation.boardId,
      email: invitation.email,
      inviteeUserId: invitation.inviteeUserId,
      invitedByUserId: invitation.invitedByUserId,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      respondedAt: invitation.respondedAt,
      board: invitation.board,
      invitee: invitation.invitee,
      invitedBy: invitation.invitedBy,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };
  }
}
