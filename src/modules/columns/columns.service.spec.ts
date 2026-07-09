import { mock, MockProxy } from 'jest-mock-extended';
import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@common/exceptions/error-code';
import { StatusColor } from '@prisma/client';
import { ColumnsService } from './columns.service';
import { ColumnsRepository } from './repositories/columns.repository';
import { CreateColumnDto, UpdateColumnDto } from './dto/column.dto';
import { makeColumnRecord } from '../../../test/factories/column.factory';
import { makeJwtPayload } from '../../../test/factories/jwt-payload.factory';

describe('ColumnsService', () => {
  let service: ColumnsService;
  let columnsRepository: MockProxy<ColumnsRepository>;

  const user = makeJwtPayload({ userId: 10 });

  beforeEach(() => {
    columnsRepository = mock<ColumnsRepository>();
    service = new ColumnsService(columnsRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findAll', () => {
    it('should return columns mapped to response dtos with _count', async () => {
      const columns = [
        makeColumnRecord({ id: 1, position: 0, _count: { cards: 3 } }),
        makeColumnRecord({ id: 2, position: 1, _count: { cards: 0 } }),
      ];
      columnsRepository.findByBoardId.mockResolvedValue(columns as never);

      const result = await service.findAll(user, 1, {} as never);

      expect(columnsRepository.findByBoardId).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        boardId: columns[0].boardId,
        title: columns[0].title,
        statusColor: columns[0].statusColor,
        position: 0,
        createdAt: columns[0].createdAt,
        updatedAt: columns[0].updatedAt,
        _count: { cards: 3 },
      });
    });

    it('should return an empty array when the board has no columns', async () => {
      columnsRepository.findByBoardId.mockResolvedValue([] as never);

      const result = await service.findAll(user, 1, {} as never);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const dto: CreateColumnDto = { title: 'Review', statusColor: StatusColor.BLUE };

    it('should create the column and attach an empty cards array', async () => {
      const created = makeColumnRecord({ id: 5, title: dto.title, statusColor: dto.statusColor });
      columnsRepository.create.mockResolvedValue(created as never);

      const result = await service.create(user, 1, dto);

      expect(columnsRepository.create).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual({
        id: 5,
        boardId: created.boardId,
        title: dto.title,
        statusColor: dto.statusColor,
        position: created.position,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        cards: [],
      });
      expect(result).not.toHaveProperty('_count');
    });
  });

  describe('update', () => {
    const dto: UpdateColumnDto = { title: 'Done' };

    it('should throw COLUMN_NOT_FOUND when the column does not exist', async () => {
      columnsRepository.findActiveById.mockResolvedValue(null as never);

      await expect(service.update(user, 1, 99, dto)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.COLUMN_NOT_FOUND },
      });
      expect(columnsRepository.update).not.toHaveBeenCalled();
    });

    it('should throw COLUMN_NOT_FOUND when the column belongs to a different board', async () => {
      const column = makeColumnRecord({ id: 2, boardId: 999 });
      columnsRepository.findActiveById.mockResolvedValue(column as never);

      await expect(service.update(user, 1, 2, dto)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.COLUMN_NOT_FOUND },
      });
    });

    it('should not validate cards when dto.cards is not provided', async () => {
      const column = makeColumnRecord({ id: 2, boardId: 1 });
      columnsRepository.findActiveById.mockResolvedValue(column as never);
      columnsRepository.update.mockResolvedValue(column as never);

      await service.update(user, 1, 2, dto);

      expect(columnsRepository.countMatchingCards).not.toHaveBeenCalled();
      expect(columnsRepository.update).toHaveBeenCalledWith(2, dto);
    });

    it('should validate unique card ids against countMatchingCards when dto.cards is provided', async () => {
      const column = makeColumnRecord({ id: 2, boardId: 1 });
      const cardsDto: UpdateColumnDto = {
        cards: [
          { id: 11, position: 0 },
          { id: 12, position: 1 },
          { id: 11, position: 0 },
        ],
      };
      columnsRepository.findActiveById.mockResolvedValue(column as never);
      columnsRepository.countMatchingCards.mockResolvedValue(2);
      columnsRepository.update.mockResolvedValue(column as never);

      await service.update(user, 1, 2, cardsDto);

      expect(columnsRepository.countMatchingCards).toHaveBeenCalledWith(2, [
        11, 12,
      ]);
      expect(columnsRepository.update).toHaveBeenCalledWith(2, cardsDto);
    });

    it('should throw CARDS_NOT_BELONG_TO_COLUMN 400 when the matching count does not match unique card ids', async () => {
      const column = makeColumnRecord({ id: 2, boardId: 1 });
      const cardsDto: UpdateColumnDto = {
        cards: [
          { id: 11, position: 0 },
          { id: 12, position: 1 },
        ],
      };
      columnsRepository.findActiveById.mockResolvedValue(column as never);
      columnsRepository.countMatchingCards.mockResolvedValue(1);

      await expect(
        service.update(user, 1, 2, cardsDto),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: { errorCode: ErrorCode.CARDS_NOT_BELONG_TO_COLUMN },
      });
      expect(columnsRepository.update).not.toHaveBeenCalled();
    });

    it('should throw COLUMN_NOT_FOUND 404 when the repository update unexpectedly returns null', async () => {
      const column = makeColumnRecord({ id: 2, boardId: 1 });
      columnsRepository.findActiveById.mockResolvedValue(column as never);
      columnsRepository.update.mockResolvedValue(null as never);

      await expect(service.update(user, 1, 2, dto)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.COLUMN_NOT_FOUND },
      });
    });

    it('should return the mapped response dto without _count on success', async () => {
      const column = makeColumnRecord({ id: 2, boardId: 1 });
      const updated = makeColumnRecord({ id: 2, boardId: 1, title: 'Done' });
      columnsRepository.findActiveById.mockResolvedValue(column as never);
      columnsRepository.update.mockResolvedValue(updated as never);

      const result = await service.update(user, 1, 2, dto);

      expect(result).toEqual({
        id: 2,
        boardId: 1,
        title: 'Done',
        statusColor: updated.statusColor,
        position: updated.position,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });
      expect(result).not.toHaveProperty('_count');
    });
  });

  describe('remove', () => {
    it('should throw COLUMN_NOT_FOUND when the column does not exist', async () => {
      columnsRepository.findActiveById.mockResolvedValue(null as never);

      await expect(service.remove(user, 1, 99)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.COLUMN_NOT_FOUND },
      });
      expect(columnsRepository.softDeleteWithCards).not.toHaveBeenCalled();
    });

    it('should throw COLUMN_NOT_FOUND when the column belongs to a different board', async () => {
      const column = makeColumnRecord({ id: 2, boardId: 999 });
      columnsRepository.findActiveById.mockResolvedValue(column as never);

      await expect(service.remove(user, 1, 2)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.COLUMN_NOT_FOUND },
      });
    });

    it('should soft delete the column with its cards and return a fixed success message', async () => {
      const column = makeColumnRecord({ id: 2, boardId: 1 });
      columnsRepository.findActiveById.mockResolvedValue(column as never);
      columnsRepository.softDeleteWithCards.mockResolvedValue(undefined as never);

      const result = await service.remove(user, 1, 2);

      expect(columnsRepository.softDeleteWithCards).toHaveBeenCalledWith(2, 1);
      expect(result).toEqual({
        deleteResult: 'Column and its Cards deleted successfully!',
      });
    });
  });
});
