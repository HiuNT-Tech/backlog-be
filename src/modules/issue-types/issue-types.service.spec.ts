import { mock, MockProxy } from 'jest-mock-extended';
import { HttpStatus } from '@nestjs/common';
import { Prisma, StatusColor } from '@prisma/client';
import { ErrorCode } from '@common/exceptions/error-code';
import { IssueTypesService } from './issue-types.service';
import { IssueTypesRepository } from './repositories/issue-types.repository';
import {
  CreateIssueTypeDto,
  ListIssueTypesQueryDto,
  UpdateIssueTypeDto,
} from './dto/issue-type.dto';
import { makeJwtPayload } from '../../../test/factories/jwt-payload.factory';
import { makeIssueTypeRecord } from '../../../test/factories/issue-type.factory';

describe('IssueTypesService', () => {
  let service: IssueTypesService;
  let issueTypesRepository: MockProxy<IssueTypesRepository>;

  beforeEach(() => {
    issueTypesRepository = mock<IssueTypesRepository>();
    service = new IssueTypesService(issueTypesRepository);
  });

  describe('findAll', () => {
    const user = makeJwtPayload({ userId: 1 });
    const query: ListIssueTypesQueryDto = Object.assign(
      new ListIssueTypesQueryDto(),
      { skip: 0, limit: 10 },
    );

    it('should map repository items into response dtos with count', async () => {
      const record = makeIssueTypeRecord({ id: 1, issueCount: 3 });
      issueTypesRepository.findByBoard.mockResolvedValue({
        items: [record],
        count: 1,
      } as never);

      const result = await service.findAll(user, 10, query);

      expect(issueTypesRepository.findByBoard).toHaveBeenCalledWith(
        10,
        query,
      );
      expect(result).toEqual({
        items: [
          {
            id: record.id,
            boardId: record.boardId,
            name: record.name,
            statusColor: record.statusColor,
            issueCount: 3,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          },
        ],
        count: 1,
      });
    });

    it('should default issueCount to 0 when an item has no issueCount field', async () => {
      const record = makeIssueTypeRecord({ id: 2 });
      delete (record as { issueCount?: number }).issueCount;
      issueTypesRepository.findByBoard.mockResolvedValue({
        items: [record],
        count: 1,
      } as never);

      const result = await service.findAll(user, 10, query);

      expect(result.items[0].issueCount).toBe(0);
    });
  });

  describe('create', () => {
    const user = makeJwtPayload({ userId: 1 });
    const dto: CreateIssueTypeDto = {
      name: 'Bug',
      statusColor: StatusColor.RED,
    };

    it('should check name availability, create and return with issueCount 0', async () => {
      issueTypesRepository.findActiveByName.mockResolvedValue(null);
      const created = makeIssueTypeRecord({ id: 5, name: 'Bug' });
      issueTypesRepository.create.mockResolvedValue(created);

      const result = await service.create(user, 10, dto);

      expect(issueTypesRepository.findActiveByName).toHaveBeenCalledWith(
        10,
        'Bug',
      );
      expect(issueTypesRepository.create).toHaveBeenCalledWith(10, dto);
      expect(result).toEqual({
        id: created.id,
        boardId: created.boardId,
        name: created.name,
        statusColor: created.statusColor,
        issueCount: 0,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      });
    });

    it('should throw ISSUE_TYPE_NAME_EXISTS 409 when an active issue type with the same name exists', async () => {
      issueTypesRepository.findActiveByName.mockResolvedValue({ id: 99 });

      await expect(service.create(user, 10, dto)).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        response: { errorCode: ErrorCode.ISSUE_TYPE_NAME_EXISTS },
      });
      expect(issueTypesRepository.create).not.toHaveBeenCalled();
    });

    it('should map a P2002 unique constraint error from the repository create call to ISSUE_TYPE_NAME_EXISTS 409', async () => {
      issueTypesRepository.findActiveByName.mockResolvedValue(null);
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' },
      );
      issueTypesRepository.create.mockRejectedValue(prismaError);

      await expect(service.create(user, 10, dto)).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        response: { errorCode: ErrorCode.ISSUE_TYPE_NAME_EXISTS },
      });
    });

    it('should rethrow non-P2002 errors from the repository create call unchanged', async () => {
      issueTypesRepository.findActiveByName.mockResolvedValue(null);
      const otherError = new Error('unexpected db error');
      issueTypesRepository.create.mockRejectedValue(otherError);

      await expect(service.create(user, 10, dto)).rejects.toThrow(
        'unexpected db error',
      );
    });
  });

  describe('update', () => {
    const user = makeJwtPayload({ userId: 1 });

    it('should throw ISSUE_TYPE_NOT_FOUND 404 when the issue type does not belong to the board', async () => {
      issueTypesRepository.findActiveByBoardAndId.mockResolvedValue(null);

      await expect(
        service.update(user, 10, 5, { name: 'Feature' }),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.ISSUE_TYPE_NOT_FOUND },
      });
      expect(issueTypesRepository.update).not.toHaveBeenCalled();
    });

    it('should not re-check name availability when dto.name is undefined', async () => {
      const existing = makeIssueTypeRecord({ id: 5, name: 'Bug' });
      issueTypesRepository.findActiveByBoardAndId.mockResolvedValue(existing);
      const updated = makeIssueTypeRecord({
        id: 5,
        name: 'Bug',
        statusColor: StatusColor.BLUE,
      });
      issueTypesRepository.update.mockResolvedValue(updated);

      const dto: UpdateIssueTypeDto = { statusColor: StatusColor.BLUE };
      const result = await service.update(user, 10, 5, dto);

      expect(issueTypesRepository.findActiveByName).not.toHaveBeenCalled();
      expect(issueTypesRepository.update).toHaveBeenCalledWith(5, dto);
      expect(result.issueCount).toBe(0);
    });

    it('should not re-check name availability when dto.name equals the current name', async () => {
      const existing = makeIssueTypeRecord({ id: 5, name: 'Bug' });
      issueTypesRepository.findActiveByBoardAndId.mockResolvedValue(existing);
      issueTypesRepository.update.mockResolvedValue(existing);

      const dto: UpdateIssueTypeDto = { name: 'Bug' };
      await service.update(user, 10, 5, dto);

      expect(issueTypesRepository.findActiveByName).not.toHaveBeenCalled();
    });

    it('should check name availability excluding itself when dto.name differs from the current name', async () => {
      const existing = makeIssueTypeRecord({ id: 5, name: 'Bug' });
      issueTypesRepository.findActiveByBoardAndId.mockResolvedValue(existing);
      issueTypesRepository.findActiveByName.mockResolvedValue(null);
      const updated = makeIssueTypeRecord({ id: 5, name: 'Feature' });
      issueTypesRepository.update.mockResolvedValue(updated);

      const dto: UpdateIssueTypeDto = { name: 'Feature' };
      const result = await service.update(user, 10, 5, dto);

      expect(issueTypesRepository.findActiveByName).toHaveBeenCalledWith(
        10,
        'Feature',
      );
      expect(issueTypesRepository.update).toHaveBeenCalledWith(5, dto);
      expect(result.name).toBe('Feature');
    });

    it('should throw ISSUE_TYPE_NAME_EXISTS 409 when another active issue type already uses the new name', async () => {
      const existing = makeIssueTypeRecord({ id: 5, name: 'Bug' });
      issueTypesRepository.findActiveByBoardAndId.mockResolvedValue(existing);
      issueTypesRepository.findActiveByName.mockResolvedValue({ id: 99 });

      await expect(
        service.update(user, 10, 5, { name: 'Feature' }),
      ).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        response: { errorCode: ErrorCode.ISSUE_TYPE_NAME_EXISTS },
      });
      expect(issueTypesRepository.update).not.toHaveBeenCalled();
    });

    it('should not conflict when the found active name belongs to the same issue type being updated', async () => {
      const existing = makeIssueTypeRecord({ id: 5, name: 'Bug' });
      issueTypesRepository.findActiveByBoardAndId.mockResolvedValue(existing);
      issueTypesRepository.findActiveByName.mockResolvedValue({ id: 5 });
      const updated = makeIssueTypeRecord({ id: 5, name: 'Feature' });
      issueTypesRepository.update.mockResolvedValue(updated);

      const result = await service.update(user, 10, 5, { name: 'Feature' });

      expect(issueTypesRepository.update).toHaveBeenCalled();
      expect(result.name).toBe('Feature');
    });

    it('should map a P2002 unique constraint error from the repository update call to ISSUE_TYPE_NAME_EXISTS 409', async () => {
      const existing = makeIssueTypeRecord({ id: 5, name: 'Bug' });
      issueTypesRepository.findActiveByBoardAndId.mockResolvedValue(existing);
      issueTypesRepository.findActiveByName.mockResolvedValue(null);
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' },
      );
      issueTypesRepository.update.mockRejectedValue(prismaError);

      await expect(
        service.update(user, 10, 5, { name: 'Feature' }),
      ).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        response: { errorCode: ErrorCode.ISSUE_TYPE_NAME_EXISTS },
      });
    });

    it('should hardcode issueCount to 0 on the response even when the updated record carries a different issueCount (documents current behavior)', async () => {
      const existing = makeIssueTypeRecord({ id: 5, name: 'Bug' });
      issueTypesRepository.findActiveByBoardAndId.mockResolvedValue(existing);
      const updated = makeIssueTypeRecord({ id: 5, name: 'Bug' }) as ReturnType<
        typeof makeIssueTypeRecord
      > & { issueCount?: number };
      updated.issueCount = 42;
      issueTypesRepository.update.mockResolvedValue(updated);

      const result = await service.update(user, 10, 5, {
        statusColor: StatusColor.GREEN,
      });

      // NOTE: pre-existing behavior — `update()` always sets issueCount to 0 on the
      // response regardless of the actual current card count for this issue type.
      expect(result.issueCount).toBe(0);
    });
  });

  describe('remove', () => {
    const user = makeJwtPayload({ userId: 1 });

    it('should throw ISSUE_TYPE_NOT_FOUND 404 when the issue type does not belong to the board', async () => {
      issueTypesRepository.findActiveByBoardAndId.mockResolvedValue(null);

      await expect(service.remove(user, 10, 5)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.ISSUE_TYPE_NOT_FOUND },
      });
      expect(issueTypesRepository.delete).not.toHaveBeenCalled();
    });

    it('should delete the issue type and return the fixed success message', async () => {
      const existing = makeIssueTypeRecord({ id: 5 });
      issueTypesRepository.findActiveByBoardAndId.mockResolvedValue(existing);
      issueTypesRepository.delete.mockResolvedValue(undefined);

      const result = await service.remove(user, 10, 5);

      expect(issueTypesRepository.delete).toHaveBeenCalledWith(5);
      expect(result).toEqual({
        deleteResult: 'Issue type deleted successfully!',
      });
    });
  });

  describe('ensureBelongsToBoard', () => {
    it('should return the issue type record when it is found active on the board', async () => {
      const record = makeIssueTypeRecord({ id: 5, boardId: 10 });
      issueTypesRepository.findActiveByBoardAndId.mockResolvedValue(record);

      const result = await service.ensureBelongsToBoard(10, 5);

      expect(issueTypesRepository.findActiveByBoardAndId).toHaveBeenCalledWith(
        10,
        5,
      );
      expect(result).toBe(record);
    });

    it('should throw ISSUE_TYPE_NOT_FOUND 404 when the repository returns null', async () => {
      issueTypesRepository.findActiveByBoardAndId.mockResolvedValue(null);

      await expect(service.ensureBelongsToBoard(10, 5)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.ISSUE_TYPE_NOT_FOUND },
      });
    });
  });
});
