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

const invitationTtlMs = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class InvitationsService {
  constructor(
    private readonly invitationsRepository: InvitationsRepository,
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

    await this.sendInvitationEmail({
      board,
      inviter,
      email,
      role: dto.role,
      token,
      inviteeIsActive: invitee?.isActive === true,
    });

    return this.toInvitationResponse(invitation);
  }

  async listForBoard(
    user: JwtPayload,
    boardId: number,
    query: ListBoardInvitationsQueryDto,
  ): Promise<InvitationResponseDto[]> {
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

    const invitation = await this.invitationsRepository.findById(invitationId);
    if (!invitation) {
      throw new BusinessException(
        ErrorCode.INVITATION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const revoked = await this.invitationsRepository.revoke(invitationId);
    if (!revoked) {
      throw new BusinessException(
        ErrorCode.INVITATION_ALREADY_RESPONDED,
        HttpStatus.CONFLICT,
      );
    }

    return this.toInvitationResponse(revoked);
  }

  async resend(
    user: JwtPayload,
    boardId: number,
    invitationId: number,
  ): Promise<InvitationResponseDto> {
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

    const invitation = await this.invitationsRepository.findByIdForBoard(
      boardId,
      invitationId,
    );
    if (!invitation) {
      throw new BusinessException(
        ErrorCode.INVITATION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const invitee = await this.usersService.findByEmail(invitation.email);
    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + invitationTtlMs);

    const resent = await this.invitationsRepository.resend(invitationId, {
      token,
      expiresAt,
    });

    if (!resent) {
      throw new BusinessException(
        ErrorCode.INVITATION_ALREADY_RESPONDED,
        HttpStatus.CONFLICT,
      );
    }

    await this.sendInvitationEmail({
      board,
      inviter,
      email: resent.email,
      role: resent.role,
      token,
      inviteeIsActive: invitee?.isActive === true,
    });

    return this.toInvitationResponse(resent);
  }

  async findByToken(token: string): Promise<InvitationResponseDto> {
    const invitation = await this.existedInvitation(token);

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
    const invitation = await this.existedInvitation(token);

    this.ensureInvitationBelongsToUser(invitation, user);
    await this.ensureInvitationStatusValid(invitation);

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
    const invitation = await this.existedInvitation(token);

    this.ensureInvitationBelongsToUser(invitation, user);
    await this.ensureInvitationStatusValid(invitation);

    const declined = await this.invitationsRepository.decline(invitation.id);
    if (!declined) {
      throw new BusinessException(
        ErrorCode.INVITATION_INVALID_OR_EXPIRED,
        HttpStatus.FORBIDDEN,
      );
    }

    return this.toInvitationResponse(declined);
  }

  async listMine(user: JwtPayload): Promise<InvitationResponseDto[]> {
    await this.invitationsRepository.expirePendingForUser(
      user.userId,
      user.email,
    );

    const invitations = await this.invitationsRepository.findPendingForUser(
      user.userId,
      user.email,
    );

    return invitations.map((invitation) =>
      this.toInvitationResponse(invitation, { includeToken: true }),
    );
  }

  async bindPendingByEmail(user: {
    id: number;
    email: string;
    isActive: boolean;
  }): Promise<number> {
    if (!user.isActive) {
      return 0;
    }

    return this.invitationsRepository.bindPendingByEmail(user.email, user.id);
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

  private async existedInvitation(token: string): Promise<InvitationRecord> {
    const invitation = await this.invitationsRepository.findByToken(token);
    if (!invitation) {
      throw new BusinessException(
        ErrorCode.INVITATION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    return invitation;
  }

  private async ensureInvitationStatusValid(invitation: InvitationRecord) {
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

  private async sendInvitationEmail(params: {
    board: { title: string };
    inviter: { displayName: string | null; email: string };
    email: string;
    role: BoardMemberRole;
    token: string;
    inviteeIsActive: boolean;
  }): Promise<void> {
    const invitationUrl = params.inviteeIsActive
      ? getAcceptInvitationUrl(this.configService, params.token)
      : getRegisterInvitationUrl(
          this.configService,
          params.token,
          params.email,
        );

    await this.emailProvider.sendEmail(
      params.email,
      `Backlog: You have been invited to join "${params.board.title}"`,
      `
        <p>Hi,</p>
        <p><strong>${params.inviter.displayName ?? params.inviter.email}</strong> has invited you to join the board <strong>${params.board.title}</strong> as <strong>${params.role}</strong>.</p>
        <p><a href="${invitationUrl}">Open invitation</a></p>
        <p>This invitation will expire in 7 days.</p>
      `,
    );
  }

  private toInvitationResponse(
    invitation: InvitationRecord,
    options: { includeToken?: boolean } = {},
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
      ...(options.includeToken ? { token: invitation.token } : {}),
    };
  }
}
