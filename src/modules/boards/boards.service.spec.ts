import { mock, MockProxy } from 'jest-mock-extended';
import { BoardType } from '@prisma/client';
import { BoardsService } from './boards.service';
import { BoardAccessService } from './board-access.service';
import { BoardsRepository } from './repositories/boards.repository';
import { CreateSampleBoardDto, DuplicateBoardDto } from './dto/board.dto';
import { DEFAULT_SAMPLE_BOARD_LOCALE } from './constants';
import { makeBoardRecord } from '../../../test/factories/board.factory';
import { makeJwtPayload } from '../../../test/factories/jwt-payload.factory';

/**
 * Cover `duplicate` và `createSample` — các method còn lại
 * (create/update/findOne/...) chưa có test riêng.
 */
describe('BoardsService', () => {
  let service: BoardsService;
  let boardsRepository: MockProxy<BoardsRepository>;
  let boardAccessService: MockProxy<BoardAccessService>;

  const user = makeJwtPayload({ userId: 7 });
  const dto: DuplicateBoardDto = {
    title: 'Copy of Board',
    boardCode: 'COPY',
  };

  beforeEach(() => {
    boardsRepository = mock<BoardsRepository>();
    boardAccessService = mock<BoardAccessService>();
    service = new BoardsService(boardsRepository, boardAccessService, mock());
  });

  describe('duplicate', () => {
    it('should throw a conflict when the new boardCode already exists', async () => {
      boardsRepository.findByCode.mockResolvedValue({ id: 5 });

      await expect(service.duplicate(user, 1, dto)).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: 'BOARD_CODE_EXISTS' }),
      });
      expect(boardsRepository.duplicateBoard).not.toHaveBeenCalled();
    });

    it('should throw BOARD_NOT_FOUND when the source board does not exist', async () => {
      boardsRepository.findByCode.mockResolvedValue(null);
      boardsRepository.duplicateBoard.mockResolvedValue(null);

      await expect(service.duplicate(user, 1, dto)).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: 'BOARD_NOT_FOUND' }),
      });
    });

    it('should duplicate with the given sourceBoardId, dto and actor userId', async () => {
      boardsRepository.findByCode.mockResolvedValue(null);
      const newBoard = makeBoardRecord({ id: 99, boardCode: 'COPY' });
      boardsRepository.duplicateBoard.mockResolvedValue(newBoard);
      boardsRepository.findBoardCards.mockResolvedValue([]);

      await service.duplicate(user, 1, dto);

      expect(boardsRepository.duplicateBoard).toHaveBeenCalledWith({
        sourceBoardId: 1,
        dto,
        userId: 7,
      });
      expect(boardsRepository.findBoardCards).toHaveBeenCalledWith(99);
    });

    it('should map the new board and its cards into the response dto', async () => {
      boardsRepository.findByCode.mockResolvedValue(null);
      const newBoard = makeBoardRecord({
        id: 99,
        boardCode: 'COPY',
        type: BoardType.PUBLIC,
      });
      boardsRepository.duplicateBoard.mockResolvedValue(newBoard);
      boardsRepository.findBoardCards.mockResolvedValue([
        {
          id: 501,
          boardId: 99,
          columnId: newBoard.columns[0].id,
          cardNumber: 1,
          cardCode: 'COPY-1',
          title: 'Copied card',
          description: null,
          priority: null,
          assigneeUserId: null,
          position: 0,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ] as never);

      const result = await service.duplicate(user, 1, dto);

      expect(result.id).toBe(99);
      expect(result.boardCode).toBe('COPY');
      expect(result.columns[0].cards).toHaveLength(1);
      expect(result.columns[0].cards[0].title).toBe('Copied card');
    });
  });

  describe('createSample', () => {
    const sampleDto: CreateSampleBoardDto = {
      title: 'Sample Project',
      boardCode: 'SAMPLE',
    };

    it('should throw a conflict when the boardCode already exists', async () => {
      boardsRepository.findByCode.mockResolvedValue({ id: 5 });

      await expect(service.createSample(user, sampleDto)).rejects.toMatchObject(
        {
          response: expect.objectContaining({ errorCode: 'BOARD_CODE_EXISTS' }),
        },
      );
      expect(boardsRepository.createSampleBoard).not.toHaveBeenCalled();
    });

    it('should fall back to the default locale when the dto omits it', async () => {
      boardsRepository.findByCode.mockResolvedValue(null);
      boardsRepository.createSampleBoard.mockResolvedValue(
        makeBoardRecord({ id: 99, boardCode: 'SAMPLE' }),
      );
      boardsRepository.findBoardCards.mockResolvedValue([]);

      await service.createSample(user, sampleDto);

      expect(boardsRepository.createSampleBoard).toHaveBeenCalledWith({
        dto: sampleDto,
        userId: 7,
        locale: DEFAULT_SAMPLE_BOARD_LOCALE,
      });
      expect(boardsRepository.findBoardCards).toHaveBeenCalledWith(99);
    });

    it('should pass the requested locale through to the repository', async () => {
      boardsRepository.findByCode.mockResolvedValue(null);
      boardsRepository.createSampleBoard.mockResolvedValue(
        makeBoardRecord({ id: 99, boardCode: 'SAMPLE' }),
      );
      boardsRepository.findBoardCards.mockResolvedValue([]);

      await service.createSample(user, { ...sampleDto, locale: 'vi' });

      expect(boardsRepository.createSampleBoard).toHaveBeenCalledWith(
        expect.objectContaining({ locale: 'vi' }),
      );
    });

    it('should throw BOARD_NOT_FOUND when the repository returns nothing', async () => {
      boardsRepository.findByCode.mockResolvedValue(null);
      boardsRepository.createSampleBoard.mockResolvedValue(null);

      await expect(service.createSample(user, sampleDto)).rejects.toMatchObject(
        {
          response: expect.objectContaining({ errorCode: 'BOARD_NOT_FOUND' }),
        },
      );
    });

    it('should nest the sample cards under their column in the response', async () => {
      boardsRepository.findByCode.mockResolvedValue(null);
      const newBoard = makeBoardRecord({ id: 99, boardCode: 'SAMPLE' });
      boardsRepository.createSampleBoard.mockResolvedValue(newBoard);
      boardsRepository.findBoardCards.mockResolvedValue([
        {
          id: 501,
          boardId: 99,
          columnId: newBoard.columns[0].id,
          cardNumber: 1,
          cardCode: 'SAMPLE-1',
          title: 'Sample card',
          description: null,
          priority: null,
          assigneeUserId: null,
          position: 0,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ] as never);

      const result = await service.createSample(user, sampleDto);

      expect(result.id).toBe(99);
      expect(result.columns[0].cards[0].cardCode).toBe('SAMPLE-1');
    });
  });
});
