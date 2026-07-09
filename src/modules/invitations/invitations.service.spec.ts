import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BoardMemberRole, BoardInvitationStatus } from '@prisma/client';
import { mock, MockProxy } from 'jest-mock-extended';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';
import { EmailProvider } from '@/providers/brevo.provider';
import { BoardMembersService } from '@modules/board-members/board-members.service';
import { BoardsService } from '@modules/boards/boards.service';
import { UsersService } from '@modules/users/users.service';
import { InvitationsService } from './invitations.service';
import { InvitationsRepository } from './repositories/invitations.repository';
import { makeJwtPayload } from '../../../test/factories/jwt-payload.factory';
import { makeInvitationRecord } from '../../../test/factories/invitation.factory';
import { makeUserEntity } from '../../../test/factories/user.factory';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let invitationsRepository: MockProxy<InvitationsRepository>;
  let boardMembersService: MockProxy<BoardMembersService>;
  let boardsService: MockProxy<BoardsService>;
  let usersService: MockProxy<UsersService>;
  let configService: MockProxy<ConfigService>;
  let emailProvider: MockProxy<EmailProvider>;

  const board = { id: 1, title: 'Backlog Board', boardCode: 'BLB' };
  const inviter = makeUserEntity({ id: 1, displayName: 'Inviter', email: 'inviter@example.com' });

  beforeEach(() => {
    invitationsRepository = mock<InvitationsRepository>();
    boardMembersService = mock<BoardMembersService>();
    boardsService = mock<BoardsService>();
    usersService = mock<UsersService>();
    configService = mock<ConfigService>();
    emailProvider = mock<EmailProvider>();

    service = new InvitationsService(
      invitationsRepository,
      boardMembersService,
      boardsService,
      usersService,
      configService,
      emailProvider,
    );

    configService.getOrThrow.mockReturnValue('https://frontend.example.com');
  });

  describe('createForBoard', () => {
    const user = makeJwtPayload({ userId: 1 });
    const dto = { email: 'invitee@example.com', role: BoardMemberRole.MEMBER };

    beforeEach(() => {
      boardsService.findById.mockResolvedValue(board as any);
      usersService.findByIdForAuth.mockResolvedValue(inviter);
      boardMembersService.getActiveMemberByEmail.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      invitationsRepository.create.mockResolvedValue(makeInvitationRecord());
    });

    it('should throw BOARD_NOT_FOUND when the board does not exist', async () => {
      boardsService.findById.mockResolvedValue(null as any);

      const promise = service.createForBoard(user, 1, dto as any);

      await expect(promise).rejects.toBeInstanceOf(BusinessException);
      await promise.catch((error: BusinessException) => {
        expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(error.getResponse()).toEqual(
          expect.objectContaining({ errorCode: ErrorCode.BOARD_NOT_FOUND }),
        );
      });
      expect(invitationsRepository.create).not.toHaveBeenCalled();
    });

    it('should throw USER_NOT_FOUND when the inviter does not exist', async () => {
      usersService.findByIdForAuth.mockResolvedValue(null);

      const promise = service.createForBoard(user, 1, dto as any);

      await expect(promise).rejects.toBeInstanceOf(BusinessException);
      await promise.catch((error: BusinessException) => {
        expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(error.getResponse()).toEqual(
          expect.objectContaining({ errorCode: ErrorCode.USER_NOT_FOUND }),
        );
      });
      expect(invitationsRepository.create).not.toHaveBeenCalled();
    });

    it('should normalize the email before checking active membership', async () => {
      await service.createForBoard(user, 1, { email: '  Invitee@Example.COM  ', role: BoardMemberRole.MEMBER } as any);

      expect(boardMembersService.getActiveMemberByEmail).toHaveBeenCalledWith(
        1,
        'invitee@example.com',
      );
    });

    it('should throw USER_ALREADY_MEMBER when the email already belongs to an active member', async () => {
      boardMembersService.getActiveMemberByEmail.mockResolvedValue({ id: 9 } as any);

      const promise = service.createForBoard(user, 1, dto as any);

      await expect(promise).rejects.toBeInstanceOf(BusinessException);
      await promise.catch((error: BusinessException) => {
        expect(error.getStatus()).toBe(HttpStatus.CONFLICT);
        expect(error.getResponse()).toEqual(
          expect.objectContaining({ errorCode: ErrorCode.USER_ALREADY_MEMBER }),
        );
      });
      expect(invitationsRepository.create).not.toHaveBeenCalled();
      expect(emailProvider.sendEmail).not.toHaveBeenCalled();
    });

    it('should translate a P2002 conflict from the repository into INVITATION_ALREADY_PENDING', async () => {
      const prismaError = Object.create(
        require('@prisma/client').Prisma.PrismaClientKnownRequestError.prototype,
      );
      prismaError.code = 'P2002';
      invitationsRepository.create.mockRejectedValue(prismaError);

      const promise = service.createForBoard(user, 1, dto as any);

      await expect(promise).rejects.toBeInstanceOf(BusinessException);
      await promise.catch((error: BusinessException) => {
        expect(error.getStatus()).toBe(HttpStatus.CONFLICT);
        expect(error.getResponse()).toEqual(
          expect.objectContaining({ errorCode: ErrorCode.INVITATION_ALREADY_PENDING }),
        );
      });
      expect(emailProvider.sendEmail).not.toHaveBeenCalled();
    });

    it('should rethrow non-P2002 errors from the repository unchanged', async () => {
      const otherError = new Error('unexpected failure');
      invitationsRepository.create.mockRejectedValue(otherError);

      await expect(service.createForBoard(user, 1, dto as any)).rejects.toThrow(
        'unexpected failure',
      );
    });

    it('should set inviteeUserId to null and use the register URL when there is no matching user', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await service.createForBoard(user, 1, dto as any);

      expect(invitationsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ inviteeUserId: null }),
      );
      const html = emailProvider.sendEmail.mock.calls[0][2];
      expect(html).toContain('/register?invitationToken=');
    });

    it('should set inviteeUserId to null and use the register URL when the user exists but is not active', async () => {
      usersService.findByEmail.mockResolvedValue(
        makeUserEntity({ id: 5, isActive: false, email: dto.email }),
      );

      await service.createForBoard(user, 1, dto as any);

      expect(invitationsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ inviteeUserId: null }),
      );
      const html = emailProvider.sendEmail.mock.calls[0][2];
      expect(html).toContain('/register?invitationToken=');
    });

    it('should set inviteeUserId to the user id and use the accept URL when the user exists and is active', async () => {
      usersService.findByEmail.mockResolvedValue(
        makeUserEntity({ id: 5, isActive: true, email: dto.email }),
      );

      await service.createForBoard(user, 1, dto as any);

      expect(invitationsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ inviteeUserId: 5 }),
      );
      const html = emailProvider.sendEmail.mock.calls[0][2];
      expect(html).toContain('/invitations/');
      expect(html).not.toContain('/register?invitationToken=');
    });

    it('should send the invitation email with the board title, inviter name, and role', async () => {
      await service.createForBoard(user, 1, dto as any);

      expect(emailProvider.sendEmail).toHaveBeenCalledWith(
        dto.email,
        expect.stringContaining(board.title),
        expect.stringContaining(dto.role),
      );
      const html = emailProvider.sendEmail.mock.calls[0][2];
      expect(html).toContain(inviter.displayName);
    });

    it('should fall back to the inviter email in the invitation email when displayName is not set', async () => {
      usersService.findByIdForAuth.mockResolvedValue(
        makeUserEntity({
          id: 1,
          email: 'inviter@example.com',
          displayName: null as unknown as string,
        }),
      );

      await service.createForBoard(user, 1, dto as any);

      const html = emailProvider.sendEmail.mock.calls[0][2];
      expect(html).toContain('inviter@example.com');
    });

    it('should pass boardId, role, invitedByUserId, and generated token/expiresAt to the repository', async () => {
      await service.createForBoard(user, 1, dto as any);

      expect(invitationsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          boardId: 1,
          email: dto.email,
          invitedByUserId: inviter.id,
          role: dto.role,
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      );
    });

    it('should return the mapped InvitationResponseDto built from the created record', async () => {
      const record = makeInvitationRecord({ id: 42, email: dto.email });
      invitationsRepository.create.mockResolvedValue(record);

      const result = await service.createForBoard(user, 1, dto as any);

      expect(result).toEqual({
        id: record.id,
        boardId: record.boardId,
        email: record.email,
        inviteeUserId: record.inviteeUserId,
        invitedByUserId: record.invitedByUserId,
        role: record.role,
        status: record.status,
        expiresAt: record.expiresAt,
        respondedAt: record.respondedAt,
        board: record.board,
        invitee: record.invitee,
        invitedBy: record.invitedBy,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    });
  });

  describe('listForBoard', () => {
    const user = makeJwtPayload({ userId: 1 });

    it('should expire pending invitations before fetching the list, in order', async () => {
      const callOrder: string[] = [];
      invitationsRepository.expirePendingForBoard.mockImplementation(async () => {
        callOrder.push('expire');
        return 0;
      });
      invitationsRepository.findByBoard.mockImplementation(async () => {
        callOrder.push('find');
        return [];
      });

      await service.listForBoard(user, 1, {});

      expect(invitationsRepository.expirePendingForBoard).toHaveBeenCalledWith(1);
      expect(invitationsRepository.findByBoard).toHaveBeenCalledWith(1, undefined);
      expect(callOrder).toEqual(['expire', 'find']);
    });

    it('should pass the status filter through to findByBoard', async () => {
      invitationsRepository.expirePendingForBoard.mockResolvedValue(0);
      invitationsRepository.findByBoard.mockResolvedValue([]);

      await service.listForBoard(user, 1, { status: BoardInvitationStatus.PENDING });

      expect(invitationsRepository.findByBoard).toHaveBeenCalledWith(
        1,
        BoardInvitationStatus.PENDING,
      );
    });

    it('should map each repository record to an InvitationResponseDto', async () => {
      invitationsRepository.expirePendingForBoard.mockResolvedValue(0);
      const recordA = makeInvitationRecord({ id: 1 });
      const recordB = makeInvitationRecord({ id: 2 });
      invitationsRepository.findByBoard.mockResolvedValue([recordA, recordB]);

      const result = await service.listForBoard(user, 1, {});

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ id: 1 }));
      expect(result[1]).toEqual(expect.objectContaining({ id: 2 }));
    });

    it('should return an empty array when there are no invitations', async () => {
      invitationsRepository.expirePendingForBoard.mockResolvedValue(0);
      invitationsRepository.findByBoard.mockResolvedValue([]);

      const result = await service.listForBoard(user, 1, {});

      expect(result).toEqual([]);
    });
  });

  describe('revoke', () => {
    const user = makeJwtPayload({ userId: 1 });

    it('should throw BOARD_NOT_FOUND when the board does not exist', async () => {
      boardsService.findById.mockResolvedValue(null as any);

      await expect(service.revoke(user, 1, 5)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.BOARD_NOT_FOUND },
      });
      expect(invitationsRepository.findById).not.toHaveBeenCalled();
      expect(invitationsRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw INVITATION_NOT_FOUND when the invitation does not exist', async () => {
      boardsService.findById.mockResolvedValue(board as any);
      invitationsRepository.findById.mockResolvedValue(null);

      await expect(service.revoke(user, 1, 5)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.INVITATION_NOT_FOUND },
      });
      expect(invitationsRepository.delete).not.toHaveBeenCalled();
    });

    it('should delete the invitation and return the mapped response built from the record found before deletion', async () => {
      boardsService.findById.mockResolvedValue(board as any);
      const invitation = makeInvitationRecord({ id: 5, email: 'invitee@example.com' });
      invitationsRepository.findById.mockResolvedValue(invitation);
      // Repository delete() resolves the row as deleted by Prisma; the service
      // still builds the response from the record fetched beforehand.
      invitationsRepository.delete.mockResolvedValue(
        makeInvitationRecord({ id: 5, email: 'should-be-ignored@example.com' }),
      );

      const result = await service.revoke(user, 1, 5);

      expect(invitationsRepository.delete).toHaveBeenCalledWith(5);
      expect(result).toEqual(expect.objectContaining({ id: 5, email: 'invitee@example.com' }));
    });
  });

  describe('findByToken', () => {
    it('should throw INVITATION_NOT_FOUND when no invitation matches the token', async () => {
      invitationsRepository.findByToken.mockResolvedValue(null);

      await expect(service.findByToken('missing-token')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.INVITATION_NOT_FOUND },
      });
    });

    it('should throw BOARD_NOT_FOUND when the board no longer exists', async () => {
      const invitation = makeInvitationRecord({ boardId: 7 });
      invitationsRepository.findByToken.mockResolvedValue(invitation);
      boardsService.findById.mockResolvedValue(null as any);

      await expect(service.findByToken('token')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.BOARD_NOT_FOUND },
      });
      expect(boardsService.findById).toHaveBeenCalledWith(7);
    });

    it('should return the mapped invitation response when both invitation and board exist', async () => {
      const invitation = makeInvitationRecord({ id: 3, boardId: 7 });
      invitationsRepository.findByToken.mockResolvedValue(invitation);
      boardsService.findById.mockResolvedValue(board as any);

      const result = await service.findByToken('token');

      expect(result).toEqual(expect.objectContaining({ id: 3, boardId: 7 }));
    });
  });

  describe('accept', () => {
    const user = makeJwtPayload({ userId: 10, email: 'invitee@example.com' });

    it('should throw INVITATION_NOT_FOUND when no invitation matches the token', async () => {
      invitationsRepository.findByToken.mockResolvedValue(null);

      await expect(service.accept(user, 'token')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.INVITATION_NOT_FOUND },
      });
    });

    it('should throw INVITATION_NOT_FOUND when the invitation is bound to a different user id', async () => {
      const invitation = makeInvitationRecord({ inviteeUserId: 999 });
      invitationsRepository.findByToken.mockResolvedValue(invitation);

      await expect(service.accept(user, 'token')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.INVITATION_NOT_FOUND },
      });
      expect(invitationsRepository.accept).not.toHaveBeenCalled();
    });

    it('should throw INVITATION_EMAIL_MISMATCH when inviteeUserId is null and the email does not match', async () => {
      const invitation = makeInvitationRecord({
        inviteeUserId: null,
        email: 'someone-else@example.com',
      });
      invitationsRepository.findByToken.mockResolvedValue(invitation);

      await expect(service.accept(user, 'token')).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: { errorCode: ErrorCode.INVITATION_EMAIL_MISMATCH },
      });
      expect(invitationsRepository.accept).not.toHaveBeenCalled();
    });

    it('should allow acceptance via a case/whitespace-insensitive email match when inviteeUserId is null', async () => {
      const invitation = makeInvitationRecord({
        inviteeUserId: null,
        email: '  Invitee@Example.com  ',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      invitationsRepository.findByToken.mockResolvedValue(invitation);
      invitationsRepository.accept.mockResolvedValue(invitation);

      await expect(service.accept(user, 'token')).resolves.toBeDefined();
      expect(invitationsRepository.accept).toHaveBeenCalledWith(invitation, 10);
    });

    it('should throw INVITATION_INVALID_OR_EXPIRED when the invitation status is not PENDING', async () => {
      const invitation = makeInvitationRecord({
        inviteeUserId: 10,
        status: BoardInvitationStatus.ACCEPTED,
      });
      invitationsRepository.findByToken.mockResolvedValue(invitation);

      await expect(service.accept(user, 'token')).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
        response: { errorCode: ErrorCode.INVITATION_INVALID_OR_EXPIRED },
      });
      expect(invitationsRepository.accept).not.toHaveBeenCalled();
    });

    it('should mark the invitation expired and throw INVITATION_INVALID_OR_EXPIRED when past its expiry', async () => {
      const invitation = makeInvitationRecord({
        id: 8,
        inviteeUserId: 10,
        status: BoardInvitationStatus.PENDING,
        expiresAt: new Date(Date.now() - 1000),
      });
      invitationsRepository.findByToken.mockResolvedValue(invitation);

      await expect(service.accept(user, 'token')).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
        response: { errorCode: ErrorCode.INVITATION_INVALID_OR_EXPIRED },
      });
      expect(invitationsRepository.markExpired).toHaveBeenCalledWith(8);
      expect(invitationsRepository.accept).not.toHaveBeenCalled();
    });

    it('should throw INVITATION_INVALID_OR_EXPIRED when the repository fails to accept (e.g. concurrent response)', async () => {
      const invitation = makeInvitationRecord({
        inviteeUserId: 10,
        status: BoardInvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      invitationsRepository.findByToken.mockResolvedValue(invitation);
      invitationsRepository.accept.mockResolvedValue(null);

      await expect(service.accept(user, 'token')).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
        response: { errorCode: ErrorCode.INVITATION_INVALID_OR_EXPIRED },
      });
    });

    it('should accept the invitation and return the mapped response on success', async () => {
      const invitation = makeInvitationRecord({
        id: 8,
        inviteeUserId: 10,
        status: BoardInvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      const accepted = makeInvitationRecord({
        id: 8,
        status: BoardInvitationStatus.ACCEPTED,
      });
      invitationsRepository.findByToken.mockResolvedValue(invitation);
      invitationsRepository.accept.mockResolvedValue(accepted);

      const result = await service.accept(user, 'token');

      expect(invitationsRepository.accept).toHaveBeenCalledWith(invitation, 10);
      expect(result).toEqual(
        expect.objectContaining({ id: 8, status: BoardInvitationStatus.ACCEPTED }),
      );
    });
  });

  describe('decline', () => {
    const user = makeJwtPayload({ userId: 10, email: 'invitee@example.com' });

    it('should throw INVITATION_NOT_FOUND when no invitation matches the token', async () => {
      invitationsRepository.findByToken.mockResolvedValue(null);

      await expect(service.decline(user, 'token')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.INVITATION_NOT_FOUND },
      });
    });

    it('should throw INVITATION_NOT_FOUND when the invitation is bound to a different user id', async () => {
      const invitation = makeInvitationRecord({ inviteeUserId: 999 });
      invitationsRepository.findByToken.mockResolvedValue(invitation);

      await expect(service.decline(user, 'token')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.INVITATION_NOT_FOUND },
      });
      expect(invitationsRepository.decline).not.toHaveBeenCalled();
    });

    it('should throw INVITATION_INVALID_OR_EXPIRED when the invitation status is not PENDING', async () => {
      const invitation = makeInvitationRecord({
        inviteeUserId: 10,
        status: BoardInvitationStatus.DECLINED,
      });
      invitationsRepository.findByToken.mockResolvedValue(invitation);

      await expect(service.decline(user, 'token')).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
        response: { errorCode: ErrorCode.INVITATION_INVALID_OR_EXPIRED },
      });
      expect(invitationsRepository.decline).not.toHaveBeenCalled();
    });

    it('should throw INVITATION_INVALID_OR_EXPIRED when the repository fails to decline', async () => {
      const invitation = makeInvitationRecord({
        inviteeUserId: 10,
        status: BoardInvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      invitationsRepository.findByToken.mockResolvedValue(invitation);
      invitationsRepository.decline.mockResolvedValue(null);

      await expect(service.decline(user, 'token')).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
        response: { errorCode: ErrorCode.INVITATION_INVALID_OR_EXPIRED },
      });
    });

    it('should decline the invitation and return the mapped response on success', async () => {
      const invitation = makeInvitationRecord({
        id: 9,
        inviteeUserId: 10,
        status: BoardInvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      const declined = makeInvitationRecord({
        id: 9,
        status: BoardInvitationStatus.DECLINED,
      });
      invitationsRepository.findByToken.mockResolvedValue(invitation);
      invitationsRepository.decline.mockResolvedValue(declined);

      const result = await service.decline(user, 'token');

      expect(invitationsRepository.decline).toHaveBeenCalledWith(9);
      expect(result).toEqual(
        expect.objectContaining({ id: 9, status: BoardInvitationStatus.DECLINED }),
      );
    });
  });

  describe('listMine', () => {
    const user = makeJwtPayload({ userId: 10, email: 'me@example.com' });

    it('should expire pending invitations for the user before fetching the list, in order', async () => {
      const callOrder: string[] = [];
      invitationsRepository.expirePendingForUser.mockImplementation(async () => {
        callOrder.push('expire');
        return 0;
      });
      invitationsRepository.findPendingForUser.mockImplementation(async () => {
        callOrder.push('find');
        return [];
      });

      await service.listMine(user);

      expect(invitationsRepository.expirePendingForUser).toHaveBeenCalledWith(
        10,
        'me@example.com',
      );
      expect(invitationsRepository.findPendingForUser).toHaveBeenCalledWith(
        10,
        'me@example.com',
      );
      expect(callOrder).toEqual(['expire', 'find']);
    });

    it('should map each repository record to an InvitationResponseDto', async () => {
      invitationsRepository.expirePendingForUser.mockResolvedValue(0);
      const recordA = makeInvitationRecord({ id: 1 });
      const recordB = makeInvitationRecord({ id: 2 });
      invitationsRepository.findPendingForUser.mockResolvedValue([recordA, recordB]);

      const result = await service.listMine(user);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ id: 1 }));
      expect(result[1]).toEqual(expect.objectContaining({ id: 2 }));
    });

    it('should return an empty array when there are no pending invitations', async () => {
      invitationsRepository.expirePendingForUser.mockResolvedValue(0);
      invitationsRepository.findPendingForUser.mockResolvedValue([]);

      const result = await service.listMine(user);

      expect(result).toEqual([]);
    });
  });

  describe('bindPendingByEmail', () => {
    it('should return 0 without calling the repository when the user is inactive', async () => {
      const result = await service.bindPendingByEmail({
        id: 3,
        email: 'user@example.com',
        isActive: false,
      });

      expect(result).toBe(0);
      expect(invitationsRepository.bindPendingByEmail).not.toHaveBeenCalled();
    });

    it('should bind pending invitations by email and return the bound count when the user is active', async () => {
      invitationsRepository.bindPendingByEmail.mockResolvedValue(2);

      const result = await service.bindPendingByEmail({
        id: 3,
        email: 'user@example.com',
        isActive: true,
      });

      expect(invitationsRepository.bindPendingByEmail).toHaveBeenCalledWith(
        'user@example.com',
        3,
      );
      expect(result).toBe(2);
    });
  });
});
