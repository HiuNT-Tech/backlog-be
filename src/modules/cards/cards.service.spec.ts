import { mock, MockProxy } from 'jest-mock-extended';
import { HttpStatus } from '@nestjs/common';
import { Priority } from '@common/enums/priority.enum';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';
import { BoardAccessService } from '@modules/boards/board-access.service';
import { IssueTypesService } from '@modules/issue-types/issue-types.service';
import { VersionsService } from '@modules/versions/versions.service';
import { AttachmentsService } from '@modules/attachments/attachments.service';
import { CardsService } from './cards.service';
import { CardHistoryService } from './card-history.service';
import { CardsRepository } from './repositories/cards.repository';
import { CreateCardDto, MoveCardDto, UpdateCardDto } from './dto/card.dto';
import { makeCardRecord, makeCardUser } from '../../../test/factories/card.factory';
import { makeJwtPayload } from '../../../test/factories/jwt-payload.factory';

describe('CardsService', () => {
  let service: CardsService;
  let cardsRepository: MockProxy<CardsRepository>;
  let boardAccessService: MockProxy<BoardAccessService>;
  let issueTypesService: MockProxy<IssueTypesService>;
  let versionsService: MockProxy<VersionsService>;
  let attachmentsService: MockProxy<AttachmentsService>;
  let cardHistoryService: MockProxy<CardHistoryService>;

  const user = makeJwtPayload({ userId: 42 });

  beforeEach(() => {
    cardsRepository = mock<CardsRepository>();
    boardAccessService = mock<BoardAccessService>();
    issueTypesService = mock<IssueTypesService>();
    versionsService = mock<VersionsService>();
    attachmentsService = mock<AttachmentsService>();
    cardHistoryService = mock<CardHistoryService>();
    cardHistoryService.recordCardUpdate.mockResolvedValue(undefined);
    attachmentsService.uploadFiles.mockResolvedValue([]);
    attachmentsService.addFilesToCard.mockResolvedValue([]);
    attachmentsService.removeFromCard.mockResolvedValue(undefined);
    attachmentsService.toResponse.mockImplementation((a) => ({
      id: a.id,
      fileName: a.fileName,
      fileUrl: `http://localhost/v1/attachments/${a.id}/download`,
      mimeType: a.mimeType,
      fileSize: a.fileSize,
    }));
    service = new CardsService(
      cardsRepository,
      boardAccessService,
      issueTypesService,
      versionsService,
      attachmentsService,
      cardHistoryService,
    );
  });

  describe('create', () => {
    const baseDto: CreateCardDto = {
      boardId: 1,
      columnId: 2,
      title: 'New card',
    };

    it('should propagate the error when the user lacks a contributor role', async () => {
      const error = new BusinessException(
        ErrorCode.NOT_BOARD_MEMBER,
        HttpStatus.FORBIDDEN,
      );
      boardAccessService.ensureRole.mockRejectedValue(error);

      await expect(service.create(user, baseDto)).rejects.toThrow(error);
      expect(cardsRepository.findActiveColumnByBoard).not.toHaveBeenCalled();
    });

    it('should throw COLUMN_NOT_FOUND when the column does not belong to the board', async () => {
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue(null);

      await expect(service.create(user, baseDto)).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: ErrorCode.COLUMN_NOT_FOUND }),
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('should throw INVALID_DATE_RANGE when startDate is after dueDate', async () => {
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 2 });

      await expect(
        service.create(user, {
          ...baseDto,
          startDate: '2026-05-30',
          dueDate: '2026-05-25',
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: ErrorCode.INVALID_DATE_RANGE }),
        status: HttpStatus.BAD_REQUEST,
      });
    });

    it('should allow startDate equal to dueDate', async () => {
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 2 });
      cardsRepository.create.mockResolvedValue(makeCardRecord() as any);

      await expect(
        service.create(user, {
          ...baseDto,
          startDate: '2026-05-25',
          dueDate: '2026-05-25',
        }),
      ).resolves.toBeDefined();
    });

    it('should throw ASSIGNEE_NOT_BOARD_MEMBER when assignee is not an active board member', async () => {
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 2 });
      cardsRepository.countActiveBoardMember.mockResolvedValue(0);

      await expect(
        service.create(user, { ...baseDto, assigneeUserId: 7 }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: ErrorCode.ASSIGNEE_NOT_BOARD_MEMBER,
        }),
        status: HttpStatus.FORBIDDEN,
      });
    });

    it('should skip the assignee check when assigneeUserId is explicitly null', async () => {
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 2 });
      cardsRepository.create.mockResolvedValue(makeCardRecord() as any);

      await service.create(user, { ...baseDto, assigneeUserId: null as never });

      expect(cardsRepository.countActiveBoardMember).not.toHaveBeenCalled();
    });

    it('should delegate issueTypeId validation to issueTypesService and propagate rejection', async () => {
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 2 });
      const error = new BusinessException(
        ErrorCode.ISSUE_TYPE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
      issueTypesService.ensureBelongsToBoard.mockRejectedValue(error);

      await expect(
        service.create(user, { ...baseDto, issueTypeId: 3 }),
      ).rejects.toThrow(error);
      expect(issueTypesService.ensureBelongsToBoard).toHaveBeenCalledWith(
        baseDto.boardId,
        3,
      );
    });

    it('should delegate versionId validation to versionsService and propagate rejection', async () => {
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 2 });
      const error = new BusinessException(
        ErrorCode.VERSION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
      versionsService.ensureBelongsToBoard.mockRejectedValue(error);

      await expect(
        service.create(user, { ...baseDto, versionId: 5 }),
      ).rejects.toThrow(error);
      expect(versionsService.ensureBelongsToBoard).toHaveBeenCalledWith(
        baseDto.boardId,
        5,
      );
    });

    it('should create the card and map it to a response dto on success', async () => {
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 2 });
      cardsRepository.countActiveBoardMember.mockResolvedValue(1);
      issueTypesService.ensureBelongsToBoard.mockResolvedValue(undefined as never);
      versionsService.ensureBelongsToBoard.mockResolvedValue(undefined as never);
      const record: any = makeCardRecord({
        id: 10,
        assigneeUserId: 7,
        assignee: makeCardUser({ id: 7 }),
        priority: Priority.HIGH,
      });
      cardsRepository.create.mockResolvedValue(record);

      const dto: CreateCardDto = {
        ...baseDto,
        assigneeUserId: 7,
        issueTypeId: 3,
        versionId: 5,
        priority: Priority.HIGH,
      };

      const result = await service.create(user, dto);

      expect(cardsRepository.create).toHaveBeenCalledWith(dto, user.userId, []);
      expect(result.id).toBe(10);
      expect(result.priority).toBe(Priority.HIGH);
      expect(result.assignee).toEqual({
        id: 7,
        email: record.assignee!.email,
        displayName: record.assignee!.displayName,
        avatar: record.assignee!.avatar,
      });
    });
  });

  describe('findOne', () => {
    it('should throw CARD_NOT_FOUND when the card does not exist', async () => {
      cardsRepository.findActiveById.mockResolvedValue(null);

      await expect(service.findOne(user, 1)).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: ErrorCode.CARD_NOT_FOUND }),
        status: HttpStatus.NOT_FOUND,
      });
      expect(boardAccessService.ensureMember).not.toHaveBeenCalled();
    });

    it('should propagate the error when user is not a board member', async () => {
      const record: any = makeCardRecord();
      cardsRepository.findActiveById.mockResolvedValue(record);
      const error = new BusinessException(
        ErrorCode.NOT_BOARD_MEMBER,
        HttpStatus.FORBIDDEN,
      );
      boardAccessService.ensureMember.mockRejectedValue(error);

      await expect(service.findOne(user, record.id)).rejects.toThrow(error);
    });

    it('should return the mapped card response when found and accessible', async () => {
      const record: any = makeCardRecord({ id: 5 });
      cardsRepository.findActiveById.mockResolvedValue(record);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);

      const result = await service.findOne(user, 5);

      expect(cardsRepository.findActiveById).toHaveBeenCalledWith(5);
      expect(boardAccessService.ensureMember).toHaveBeenCalledWith(
        record.boardId,
        user.userId,
      );
      expect(result.id).toBe(5);
      expect(result.assignee).toBeNull();
      expect(result.issueType).toBeNull();
      expect(result.version).toBeNull();
    });
  });

  describe('update', () => {
    it('should throw CARD_NOT_FOUND when the card does not exist', async () => {
      cardsRepository.findActiveById.mockResolvedValue(null);

      await expect(
        service.update(user, 1, { title: 'New title' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: ErrorCode.CARD_NOT_FOUND }),
      });
    });

    it('should fall back to the existing columnId when dto.columnId is undefined', async () => {
      const record: any = makeCardRecord({ columnId: 3 });
      cardsRepository.findActiveById.mockResolvedValue(record);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 3 });
      cardsRepository.update.mockResolvedValue(record);

      await service.update(user, record.id, { title: 'Updated' });

      expect(cardsRepository.findActiveColumnByBoard).toHaveBeenCalledWith(
        record.boardId,
        3,
      );
      expect(cardsRepository.update).toHaveBeenCalledWith(
        record.id,
        { title: 'Updated' },
        false,
      );
    });

    it('should throw COLUMN_NOT_FOUND when the target column does not belong to the board', async () => {
      const record: any = makeCardRecord({ columnId: 3 });
      cardsRepository.findActiveById.mockResolvedValue(record);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue(null);

      await expect(
        service.update(user, record.id, { columnId: 99 }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: ErrorCode.COLUMN_NOT_FOUND }),
      });
    });

    it('should mark columnChanged=true and pass it to repository.update when columnId differs', async () => {
      const record: any = makeCardRecord({ columnId: 3 });
      cardsRepository.findActiveById.mockResolvedValue(record);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 8 });
      cardsRepository.update.mockResolvedValue(record);

      await service.update(user, record.id, { columnId: 8 });

      expect(cardsRepository.update).toHaveBeenCalledWith(
        record.id,
        { columnId: 8 },
        true,
      );
    });

    it('should validate the date range using the existing card dates converted via toDateInput when dto omits them', async () => {
      const record: any = makeCardRecord({
        columnId: 3,
        startDate: new Date('2026-05-30T00:00:00Z'),
        dueDate: new Date('2026-05-25T00:00:00Z'),
      });
      cardsRepository.findActiveById.mockResolvedValue(record);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 3 });

      await expect(
        service.update(user, record.id, { title: 'New title' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: ErrorCode.INVALID_DATE_RANGE }),
      });
    });

    it('should use the dto date over the existing card date when only one is provided', async () => {
      const record: any = makeCardRecord({
        columnId: 3,
        startDate: new Date('2026-05-01T00:00:00Z'),
        dueDate: null,
      });
      cardsRepository.findActiveById.mockResolvedValue(record);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 3 });
      cardsRepository.update.mockResolvedValue(record);

      await expect(
        service.update(user, record.id, { dueDate: '2026-04-01' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: ErrorCode.INVALID_DATE_RANGE }),
      });
    });

    it('should throw ASSIGNEE_NOT_BOARD_MEMBER when the new assignee is not an active board member', async () => {
      const record: any = makeCardRecord({ columnId: 3 });
      cardsRepository.findActiveById.mockResolvedValue(record);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 3 });
      cardsRepository.countActiveBoardMember.mockResolvedValue(0);

      await expect(
        service.update(user, record.id, { assigneeUserId: 99 }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: ErrorCode.ASSIGNEE_NOT_BOARD_MEMBER,
        }),
      });
    });

    it('should skip the assignee check when assigneeUserId is explicitly null', async () => {
      const record: any = makeCardRecord({ columnId: 3 });
      cardsRepository.findActiveById.mockResolvedValue(record);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 3 });
      cardsRepository.update.mockResolvedValue(record);

      await service.update(user, record.id, { assigneeUserId: null as never });

      expect(cardsRepository.countActiveBoardMember).not.toHaveBeenCalled();
    });

    it('should delegate issueTypeId validation and propagate rejection', async () => {
      const record: any = makeCardRecord({ columnId: 3 });
      cardsRepository.findActiveById.mockResolvedValue(record);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 3 });
      const error = new BusinessException(
        ErrorCode.ISSUE_TYPE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
      issueTypesService.ensureBelongsToBoard.mockRejectedValue(error);

      await expect(
        service.update(user, record.id, { issueTypeId: 4 }),
      ).rejects.toThrow(error);
      expect(issueTypesService.ensureBelongsToBoard).toHaveBeenCalledWith(
        record.boardId,
        4,
      );
    });

    it('should delegate versionId validation and propagate rejection', async () => {
      const record: any = makeCardRecord({ columnId: 3 });
      cardsRepository.findActiveById.mockResolvedValue(record);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 3 });
      const error = new BusinessException(
        ErrorCode.VERSION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
      versionsService.ensureBelongsToBoard.mockRejectedValue(error);

      await expect(
        service.update(user, record.id, { versionId: 6 }),
      ).rejects.toThrow(error);
      expect(versionsService.ensureBelongsToBoard).toHaveBeenCalledWith(
        record.boardId,
        6,
      );
    });

    it('should update the card and map the result to a response dto on success', async () => {
      const record: any = makeCardRecord({ columnId: 3 });
      const updated: any = makeCardRecord({ columnId: 3, title: 'Updated title' });
      cardsRepository.findActiveById
        .mockResolvedValueOnce(record)
        .mockResolvedValueOnce(updated);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 3 });
      cardsRepository.update.mockResolvedValue(record);

      const dto: UpdateCardDto = { title: 'Updated title' };
      const result = await service.update(user, record.id, dto);

      expect(cardsRepository.update).toHaveBeenCalledWith(record.id, dto, false);
      expect(result.title).toBe('Updated title');
    });

    it('should record the update history with the before and after snapshots', async () => {
      const record: any = makeCardRecord({
        columnId: 3,
        description: 'Old description',
      });
      const updated: any = makeCardRecord({
        columnId: 3,
        description: 'New description',
      });
      cardsRepository.findActiveById
        .mockResolvedValueOnce(record)
        .mockResolvedValueOnce(updated);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 3 });
      cardsRepository.update.mockResolvedValue(updated);

      await service.update(user, record.id, { description: 'New description' });

      expect(cardHistoryService.recordCardUpdate).toHaveBeenCalledTimes(1);
      expect(cardHistoryService.recordCardUpdate).toHaveBeenCalledWith(
        record.id,
        user.userId,
        record,
        updated,
      );
    });

    it('should not record history when the update itself fails', async () => {
      const record: any = makeCardRecord({ columnId: 3 });
      cardsRepository.findActiveById.mockResolvedValueOnce(record);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 3 });
      cardsRepository.update.mockRejectedValue(new Error('db down'));

      await expect(
        service.update(user, record.id, { title: 'Updated' }),
      ).rejects.toThrow('db down');
      expect(cardHistoryService.recordCardUpdate).not.toHaveBeenCalled();
    });

    it('should upload new files and remove requested attachments', async () => {
      const record: any = makeCardRecord({ columnId: 3 });
      cardsRepository.findActiveById
        .mockResolvedValueOnce(record)
        .mockResolvedValueOnce(record);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 3 });
      cardsRepository.update.mockResolvedValue(record);
      const files = [{ originalname: 'a.png' }] as never;

      const dto: UpdateCardDto = { removeAttachmentIds: [1, 2] };
      await service.update(user, record.id, dto, files);

      expect(attachmentsService.removeFromCard).toHaveBeenCalledWith(
        record.id,
        [1, 2],
      );
      expect(attachmentsService.addFilesToCard).toHaveBeenCalledWith(
        record.id,
        files,
        user.userId,
      );
    });

    it('should throw CARD_NOT_FOUND when the card disappears between update and refetch', async () => {
      const record: any = makeCardRecord({ columnId: 3 });
      cardsRepository.findActiveById
        .mockResolvedValueOnce(record)
        .mockResolvedValueOnce(null);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnByBoard.mockResolvedValue({ id: 3 });
      cardsRepository.update.mockResolvedValue(record);

      await expect(
        service.update(user, record.id, { title: 'Updated' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: ErrorCode.CARD_NOT_FOUND }),
      });
    });
  });

  describe('findByBoard', () => {
    it('should propagate the error when the user is not a board member', async () => {
      const error = new BusinessException(
        ErrorCode.NOT_BOARD_MEMBER,
        HttpStatus.FORBIDDEN,
      );
      boardAccessService.ensureMember.mockRejectedValue(error);

      await expect(
        service.findByBoard(user, 1, { skip: 0, limit: 10 }),
      ).rejects.toThrow(error);
      expect(cardsRepository.findByBoard).not.toHaveBeenCalled();
    });

    it('should return total and mapped items on success', async () => {
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      const record1: any = makeCardRecord({ id: 1 });
      const record2: any = makeCardRecord({ id: 2 });
      cardsRepository.findByBoard.mockResolvedValue({
        total: 2,
        items: [record1, record2],
      });

      const query = { skip: 0, limit: 10 };
      const result = await service.findByBoard(user, 1, query);

      expect(cardsRepository.findByBoard).toHaveBeenCalledWith(1, query);
      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe(1);
      expect(result.items[1].id).toBe(2);
    });
  });

  describe('move', () => {
    const baseDto: MoveCardDto = {
      currentCardId: 1,
      prevColumnId: 10,
      nextColumnId: 20,
      prevCards: [],
      nextCards: [{ id: 1, position: 0 }],
    };

    it('should throw CARD_NOT_FOUND when the card does not exist', async () => {
      cardsRepository.findActiveById.mockResolvedValue(null);

      await expect(service.move(user, baseDto)).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: ErrorCode.CARD_NOT_FOUND }),
      });
    });

    it('should throw COLUMN_NOT_FOUND when prevColumn is not found', async () => {
      const record: any = makeCardRecord({ boardId: 1, columnId: 10 });
      cardsRepository.findActiveById.mockResolvedValue(record);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnWithBoard
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 20, boardId: 1 });

      await expect(service.move(user, baseDto)).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: ErrorCode.COLUMN_NOT_FOUND }),
      });
    });

    it('should throw COLUMN_NOT_FOUND when prevColumn belongs to a different board', async () => {
      const record: any = makeCardRecord({ boardId: 1, columnId: 10 });
      cardsRepository.findActiveById.mockResolvedValue(record);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnWithBoard
        .mockResolvedValueOnce({ id: 10, boardId: 999 })
        .mockResolvedValueOnce({ id: 20, boardId: 1 });

      await expect(service.move(user, baseDto)).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: ErrorCode.COLUMN_NOT_FOUND }),
      });
    });

    it('should throw COLUMN_NOT_FOUND when nextColumn is not found', async () => {
      const record: any = makeCardRecord({ boardId: 1, columnId: 10 });
      cardsRepository.findActiveById.mockResolvedValue(record);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnWithBoard
        .mockResolvedValueOnce({ id: 10, boardId: 1 })
        .mockResolvedValueOnce(null);

      await expect(service.move(user, baseDto)).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: ErrorCode.COLUMN_NOT_FOUND }),
      });
    });

    it('should throw COLUMN_NOT_FOUND when nextColumn belongs to a different board', async () => {
      const record: any = makeCardRecord({ boardId: 1, columnId: 10 });
      cardsRepository.findActiveById.mockResolvedValue(record);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnWithBoard
        .mockResolvedValueOnce({ id: 10, boardId: 1 })
        .mockResolvedValueOnce({ id: 20, boardId: 999 });

      await expect(service.move(user, baseDto)).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: ErrorCode.COLUMN_NOT_FOUND }),
      });
    });

    it('should throw MOVE_CARD_WRONG_COLUMN when the card is not currently in prevColumnId', async () => {
      const record: any = makeCardRecord({ boardId: 1, columnId: 999 });
      cardsRepository.findActiveById.mockResolvedValue(record);
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);
      cardsRepository.findActiveColumnWithBoard
        .mockResolvedValueOnce({ id: 10, boardId: 1 })
        .mockResolvedValueOnce({ id: 20, boardId: 1 });

      await expect(service.move(user, baseDto)).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: ErrorCode.MOVE_CARD_WRONG_COLUMN,
        }),
        status: HttpStatus.BAD_REQUEST,
      });
    });

    describe('ensureMoveCardsBelongToColumns validation', () => {
      const setupColumns = (boardId = 1) => {
        cardsRepository.findActiveColumnWithBoard
          .mockResolvedValueOnce({ id: 10, boardId })
          .mockResolvedValueOnce({ id: 20, boardId });
      };

      it('should throw MOVE_CARD_MISSING_CURRENT when nextCards does not include currentCardId', async () => {
        const record: any = makeCardRecord({ boardId: 1, columnId: 10 });
        cardsRepository.findActiveById.mockResolvedValue(record);
        boardAccessService.ensureMember.mockResolvedValue(undefined as never);
        setupColumns();

        const dto: MoveCardDto = {
          ...baseDto,
          nextCards: [{ id: 2, position: 0 }],
        };

        await expect(service.move(user, dto)).rejects.toMatchObject({
          response: expect.objectContaining({
            errorCode: ErrorCode.MOVE_CARD_MISSING_CURRENT,
          }),
        });
      });

      it('should throw MOVE_CARD_INVALID_PREV when prevCards includes currentCardId', async () => {
        const record: any = makeCardRecord({ boardId: 1, columnId: 10 });
        cardsRepository.findActiveById.mockResolvedValue(record);
        boardAccessService.ensureMember.mockResolvedValue(undefined as never);
        setupColumns();

        const dto: MoveCardDto = {
          ...baseDto,
          prevCards: [{ id: 1, position: 0 }],
        };

        await expect(service.move(user, dto)).rejects.toMatchObject({
          response: expect.objectContaining({
            errorCode: ErrorCode.MOVE_CARD_INVALID_PREV,
          }),
        });
      });

      it('should throw MOVE_CARD_DUPLICATE_IDS when prevCards has duplicate ids', async () => {
        const record: any = makeCardRecord({ boardId: 1, columnId: 10 });
        cardsRepository.findActiveById.mockResolvedValue(record);
        boardAccessService.ensureMember.mockResolvedValue(undefined as never);
        setupColumns();

        const dto: MoveCardDto = {
          ...baseDto,
          prevCards: [
            { id: 2, position: 0 },
            { id: 2, position: 1 },
          ],
        };

        await expect(service.move(user, dto)).rejects.toMatchObject({
          response: expect.objectContaining({
            errorCode: ErrorCode.MOVE_CARD_DUPLICATE_IDS,
          }),
        });
      });

      it('should throw MOVE_CARD_DUPLICATE_IDS when nextCards has duplicate ids', async () => {
        const record: any = makeCardRecord({ boardId: 1, columnId: 10 });
        cardsRepository.findActiveById.mockResolvedValue(record);
        boardAccessService.ensureMember.mockResolvedValue(undefined as never);
        setupColumns();

        const dto: MoveCardDto = {
          ...baseDto,
          nextCards: [
            { id: 1, position: 0 },
            { id: 1, position: 1 },
          ],
        };

        await expect(service.move(user, dto)).rejects.toMatchObject({
          response: expect.objectContaining({
            errorCode: ErrorCode.MOVE_CARD_DUPLICATE_IDS,
          }),
        });
      });

      it('should throw MOVE_CARD_PREV_MISMATCH when countCardsInColumn does not match prevCards length', async () => {
        const record: any = makeCardRecord({ boardId: 1, columnId: 10 });
        cardsRepository.findActiveById.mockResolvedValue(record);
        boardAccessService.ensureMember.mockResolvedValue(undefined as never);
        setupColumns();

        const dto: MoveCardDto = {
          ...baseDto,
          prevCards: [{ id: 2, position: 0 }],
        };
        cardsRepository.countCardsInColumn.mockResolvedValue(0 as never);
        cardsRepository.countNextColumnCardsForMove.mockResolvedValue(1 as never);

        await expect(service.move(user, dto)).rejects.toMatchObject({
          response: expect.objectContaining({
            errorCode: ErrorCode.MOVE_CARD_PREV_MISMATCH,
          }),
        });
      });

      it('should throw MOVE_CARD_NEXT_MISMATCH when countNextColumnCardsForMove does not match nextCards length', async () => {
        const record: any = makeCardRecord({ boardId: 1, columnId: 10 });
        cardsRepository.findActiveById.mockResolvedValue(record);
        boardAccessService.ensureMember.mockResolvedValue(undefined as never);
        setupColumns();

        cardsRepository.countCardsInColumn.mockResolvedValue(0 as never);
        cardsRepository.countNextColumnCardsForMove.mockResolvedValue(0 as never);

        await expect(service.move(user, baseDto)).rejects.toMatchObject({
          response: expect.objectContaining({
            errorCode: ErrorCode.MOVE_CARD_NEXT_MISMATCH,
          }),
        });
      });

      it('should call repository.move and return a success result when all checks pass', async () => {
        const record: any = makeCardRecord({ boardId: 1, columnId: 10 });
        cardsRepository.findActiveById.mockResolvedValue(record);
        boardAccessService.ensureMember.mockResolvedValue(undefined as never);
        setupColumns();
        cardsRepository.countCardsInColumn.mockResolvedValue(0 as never);
        cardsRepository.countNextColumnCardsForMove.mockResolvedValue(1 as never);
        cardsRepository.move.mockResolvedValue(undefined as never);

        const result = await service.move(user, baseDto);

        expect(cardsRepository.move).toHaveBeenCalledWith(baseDto);
        expect(result).toEqual({ updateResult: 'Successfully!' });
      });
    });
  });

  describe('ensureCardAccessible', () => {
    it('should throw CARD_NOT_FOUND when the card does not exist', async () => {
      cardsRepository.findActiveBoardId.mockResolvedValue(null);

      await expect(service.ensureCardAccessible(user, 1)).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: ErrorCode.CARD_NOT_FOUND }),
        status: HttpStatus.NOT_FOUND,
      });
      expect(boardAccessService.ensureMember).not.toHaveBeenCalled();
    });

    it('should propagate the error when the user is not a board member', async () => {
      cardsRepository.findActiveBoardId.mockResolvedValue({ boardId: 3 });
      const error = new BusinessException(
        ErrorCode.NOT_BOARD_MEMBER,
        HttpStatus.FORBIDDEN,
      );
      boardAccessService.ensureMember.mockRejectedValue(error);

      await expect(service.ensureCardAccessible(user, 1)).rejects.toThrow(error);
    });

    it('should return the boardId on success', async () => {
      cardsRepository.findActiveBoardId.mockResolvedValue({ boardId: 3 });
      boardAccessService.ensureMember.mockResolvedValue(undefined as never);

      const result = await service.ensureCardAccessible(user, 1);

      expect(cardsRepository.findActiveBoardId).toHaveBeenCalledWith(1);
      expect(boardAccessService.ensureMember).toHaveBeenCalledWith(3, user.userId);
      expect(result).toBe(3);
    });
  });
});
