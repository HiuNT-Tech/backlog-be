import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { CardsService } from '@modules/cards/cards.service';
import { BOARD_CONTRIBUTOR_ROLES } from '@modules/boards/board-access.service';
import { CommentsService } from './comments.service';
import { CommentsRepository } from './repositories/comments.repository';
import { makeJwtPayload } from '../../../test/factories/jwt-payload.factory';
import { makeCommentRecord } from '../../../test/factories/comment.factory';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentsRepository: MockProxy<CommentsRepository>;
  let cardsService: MockProxy<CardsService>;

  beforeEach(() => {
    commentsRepository = mock<CommentsRepository>();
    cardsService = mock<CardsService>();
    service = new CommentsService(commentsRepository, cardsService);
  });

  describe('create', () => {
    it('should throw when the card is not accessible to the user', async () => {
      const user = makeJwtPayload();
      cardsService.ensureCardAccessible.mockRejectedValue(
        new NotFoundException('Card not found'),
      );

      await expect(
        service.create(user, 1, { content: 'Hello' }),
      ).rejects.toThrow(NotFoundException);
      expect(commentsRepository.create).not.toHaveBeenCalled();
    });

    it('should create the comment and return the mapped response when the card is accessible', async () => {
      const user = makeJwtPayload({ userId: 7 });
      const record = makeCommentRecord({ id: 5, cardId: 1, content: 'Hello' });
      cardsService.ensureCardAccessible.mockResolvedValue(1);
      commentsRepository.create.mockResolvedValue(record);

      const result = await service.create(user, 1, { content: 'Hello' });

      expect(cardsService.ensureCardAccessible).toHaveBeenCalledWith(
        user,
        1,
        BOARD_CONTRIBUTOR_ROLES,
      );
      expect(commentsRepository.create).toHaveBeenCalledWith(1, 7, {
        content: 'Hello',
      });
      expect(result).toEqual({
        id: record.id,
        cardId: record.cardId,
        content: record.content,
        user: {
          id: record.user.id,
          email: record.user.email,
          displayName: record.user.displayName,
          avatar: record.user.avatar,
        },
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    });
  });

  describe('findByCard', () => {
    it('should throw when the card is not accessible to the user', async () => {
      const user = makeJwtPayload();
      cardsService.ensureCardAccessible.mockRejectedValue(
        new ForbiddenException('Not a member'),
      );

      await expect(
        service.findByCard(user, 1, { skip: 0, limit: 20 }),
      ).rejects.toThrow(ForbiddenException);
      expect(commentsRepository.findByCard).not.toHaveBeenCalled();
    });

    it('should return total and mapped items when the card is accessible', async () => {
      const user = makeJwtPayload();
      const recordA = makeCommentRecord({ id: 1 });
      const recordB = makeCommentRecord({ id: 2 });
      cardsService.ensureCardAccessible.mockResolvedValue(1);
      commentsRepository.findByCard.mockResolvedValue({
        total: 2,
        items: [recordA, recordB],
      });
      const query = { skip: 0, limit: 20 };

      const result = await service.findByCard(user, 1, query);

      expect(commentsRepository.findByCard).toHaveBeenCalledWith(1, query);
      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual(
        expect.objectContaining({ id: 1, content: recordA.content }),
      );
      expect(result.items[1]).toEqual(
        expect.objectContaining({ id: 2, content: recordB.content }),
      );
    });

    it('should return an empty items array when there are no comments', async () => {
      const user = makeJwtPayload();
      cardsService.ensureCardAccessible.mockResolvedValue(1);
      commentsRepository.findByCard.mockResolvedValue({ total: 0, items: [] });

      const result = await service.findByCard(user, 1, { skip: 0, limit: 20 });

      expect(result).toEqual({ total: 0, items: [] });
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when the comment does not exist', async () => {
      const user = makeJwtPayload();
      commentsRepository.findActiveOwnershipById.mockResolvedValue(null);

      await expect(
        service.update(user, 1, { content: 'Updated' }),
      ).rejects.toThrow(new NotFoundException('Comment not found'));
      expect(commentsRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the comment belongs to another user', async () => {
      const user = makeJwtPayload({ userId: 1 });
      commentsRepository.findActiveOwnershipById.mockResolvedValue({
        id: 5,
        userId: 2,
      });

      await expect(
        service.update(user, 5, { content: 'Updated' }),
      ).rejects.toThrow(
        new ForbiddenException('You can only modify your own comments'),
      );
      expect(commentsRepository.update).not.toHaveBeenCalled();
    });

    it('should update and return the mapped response when the user owns the comment', async () => {
      const user = makeJwtPayload({ userId: 1 });
      const record = makeCommentRecord({ id: 5, content: 'Updated' });
      commentsRepository.findActiveOwnershipById.mockResolvedValue({
        id: 5,
        userId: 1,
      });
      commentsRepository.update.mockResolvedValue(record);

      const result = await service.update(user, 5, { content: 'Updated' });

      expect(commentsRepository.update).toHaveBeenCalledWith(5, {
        content: 'Updated',
      });
      expect(result).toEqual(
        expect.objectContaining({ id: 5, content: 'Updated' }),
      );
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when the comment does not exist', async () => {
      const user = makeJwtPayload();
      commentsRepository.findActiveOwnershipById.mockResolvedValue(null);

      await expect(service.remove(user, 1)).rejects.toThrow(
        new NotFoundException('Comment not found'),
      );
      expect(commentsRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the comment belongs to another user', async () => {
      const user = makeJwtPayload({ userId: 1 });
      commentsRepository.findActiveOwnershipById.mockResolvedValue({
        id: 5,
        userId: 2,
      });

      await expect(service.remove(user, 5)).rejects.toThrow(
        new ForbiddenException('You can only modify your own comments'),
      );
      expect(commentsRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should soft delete and return the delete message when the user owns the comment', async () => {
      const user = makeJwtPayload({ userId: 1 });
      commentsRepository.findActiveOwnershipById.mockResolvedValue({
        id: 5,
        userId: 1,
      });
      commentsRepository.softDelete.mockResolvedValue({ id: 5 });

      const result = await service.remove(user, 5);

      expect(commentsRepository.softDelete).toHaveBeenCalledWith(5);
      expect(result).toEqual({
        deleteResult: 'Comment deleted successfully!',
      });
    });
  });
});
