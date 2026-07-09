import { mock, MockProxy } from 'jest-mock-extended';
import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@common/exceptions/error-code';
import { makeJwtPayload } from '../../../test/factories/jwt-payload.factory';
import { makeVersionRecord } from '../../../test/factories/version.factory';
import { VersionsService } from './versions.service';
import { VersionsRepository } from './repositories/versions.repository';
import { CreateVersionDto, UpdateVersionDto } from './dto/version.dto';

describe('VersionsService', () => {
  let service: VersionsService;
  let versionsRepository: MockProxy<VersionsRepository>;

  const user = makeJwtPayload({ userId: 1 });
  const boardId = 10;

  beforeEach(() => {
    versionsRepository = mock<VersionsRepository>();
    service = new VersionsService(versionsRepository);
  });

  describe('findAll', () => {
    it('should list versions and map them to response dtos', async () => {
      const query = { skip: 0, limit: 10 } as any;
      const version = makeVersionRecord({ id: 1, boardId });
      versionsRepository.findByBoard.mockResolvedValue({
        items: [version],
        count: 1,
      });

      const result = await service.findAll(user, boardId, query);

      expect(versionsRepository.findByBoard).toHaveBeenCalledWith(
        boardId,
        query,
      );
      expect(result).toEqual({
        items: [
          {
            id: version.id,
            boardId: version.boardId,
            name: version.name,
            startDate: version.startDate,
            endDate: version.endDate,
            description: version.description,
            createdAt: version.createdAt,
            updatedAt: version.updatedAt,
          },
        ],
        count: 1,
      });
    });
  });

  describe('create', () => {
    const dto: CreateVersionDto = {
      name: 'v1.0',
      startDate: '2026-05-25',
      endDate: '2026-05-30',
      description: 'desc',
    };

    it('should create a version and return the response dto', async () => {
      const created = makeVersionRecord({ boardId, name: dto.name });
      versionsRepository.create.mockResolvedValue(created);

      const result = await service.create(user, boardId, dto);

      expect(versionsRepository.create).toHaveBeenCalledWith(boardId, dto);
      expect(result.name).toBe(dto.name);
    });

    it('should throw INVALID_DATE_RANGE 400 when startDate is after endDate', async () => {
      const invalidDto: CreateVersionDto = {
        name: 'v1.0',
        startDate: '2026-06-01',
        endDate: '2026-05-01',
      };

      await expect(
        service.create(user, boardId, invalidDto),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: { errorCode: ErrorCode.INVALID_DATE_RANGE },
      });
      expect(versionsRepository.create).not.toHaveBeenCalled();
    });

    it('should allow creation when startDate equals endDate', async () => {
      const sameDateDto: CreateVersionDto = {
        name: 'v1.0',
        startDate: '2026-05-25',
        endDate: '2026-05-25',
      };
      versionsRepository.create.mockResolvedValue(
        makeVersionRecord({ boardId }),
      );

      await expect(
        service.create(user, boardId, sameDateDto),
      ).resolves.toBeDefined();
      expect(versionsRepository.create).toHaveBeenCalled();
    });

    it('should skip the date-range check when only startDate is provided', async () => {
      const onlyStartDto: CreateVersionDto = {
        name: 'v1.0',
        startDate: '2026-05-25',
      };
      versionsRepository.create.mockResolvedValue(
        makeVersionRecord({ boardId }),
      );

      await expect(
        service.create(user, boardId, onlyStartDto),
      ).resolves.toBeDefined();
      expect(versionsRepository.create).toHaveBeenCalled();
    });

    it('should skip the date-range check when only endDate is provided', async () => {
      const onlyEndDto: CreateVersionDto = {
        name: 'v1.0',
        endDate: '2026-05-25',
      };
      versionsRepository.create.mockResolvedValue(
        makeVersionRecord({ boardId }),
      );

      await expect(
        service.create(user, boardId, onlyEndDto),
      ).resolves.toBeDefined();
      expect(versionsRepository.create).toHaveBeenCalled();
    });

    it('should skip the date-range check when both dates are missing', async () => {
      const noDateDto: CreateVersionDto = { name: 'v1.0' };
      versionsRepository.create.mockResolvedValue(
        makeVersionRecord({ boardId }),
      );

      await expect(
        service.create(user, boardId, noDateDto),
      ).resolves.toBeDefined();
      expect(versionsRepository.create).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return the version response when found', async () => {
      const version = makeVersionRecord({ id: 5, boardId });
      versionsRepository.findActiveByBoardAndId.mockResolvedValue(version);

      const result = await service.findOne(user, boardId, 5);

      expect(
        versionsRepository.findActiveByBoardAndId,
      ).toHaveBeenCalledWith(boardId, 5);
      expect(result.id).toBe(5);
    });

    it('should throw VERSION_NOT_FOUND 404 when the version does not exist', async () => {
      versionsRepository.findActiveByBoardAndId.mockResolvedValue(null);

      await expect(
        service.findOne(user, boardId, 999),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.VERSION_NOT_FOUND },
      });
    });
  });

  describe('update', () => {
    const dto: UpdateVersionDto = { name: 'v2.0' };

    it('should update the version when it belongs to the board', async () => {
      const existing = makeVersionRecord({ id: 5, boardId });
      versionsRepository.findActiveByBoardAndId.mockResolvedValue(existing);
      versionsRepository.update.mockResolvedValue({
        ...existing,
        name: 'v2.0',
      });

      const result = await service.update(user, boardId, 5, dto);

      expect(versionsRepository.findActiveByBoardAndId).toHaveBeenCalledWith(
        boardId,
        5,
      );
      expect(versionsRepository.update).toHaveBeenCalledWith(5, dto);
      expect(result.name).toBe('v2.0');
    });

    it('should throw VERSION_NOT_FOUND 404 when the version is missing', async () => {
      versionsRepository.findActiveByBoardAndId.mockResolvedValue(null);

      await expect(service.update(user, boardId, 999, dto)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.VERSION_NOT_FOUND },
      });
      expect(versionsRepository.update).not.toHaveBeenCalled();
    });

    it('should throw INVALID_DATE_RANGE 400 using dto dates when both are provided and invalid', async () => {
      const existing = makeVersionRecord({ id: 5, boardId });
      versionsRepository.findActiveByBoardAndId.mockResolvedValue(existing);
      const invalidDto: UpdateVersionDto = {
        startDate: '2026-06-01',
        endDate: '2026-05-01',
      };

      await expect(
        service.update(user, boardId, 5, invalidDto),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: { errorCode: ErrorCode.INVALID_DATE_RANGE },
      });
      expect(versionsRepository.update).not.toHaveBeenCalled();
    });

    it('should fall back to the existing startDate when the dto omits it, and reject an invalid combination', async () => {
      const existing = makeVersionRecord({
        id: 5,
        boardId,
        startDate: new Date('2026-06-10'),
        endDate: null,
      });
      versionsRepository.findActiveByBoardAndId.mockResolvedValue(existing);
      const dtoWithOnlyEndDate: UpdateVersionDto = {
        endDate: '2026-05-01',
      };

      await expect(
        service.update(user, boardId, 5, dtoWithOnlyEndDate),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: { errorCode: ErrorCode.INVALID_DATE_RANGE },
      });
    });

    it('should fall back to the existing endDate when the dto omits it, and allow a valid combination', async () => {
      const existing = makeVersionRecord({
        id: 5,
        boardId,
        startDate: null,
        endDate: new Date('2026-06-10'),
      });
      versionsRepository.findActiveByBoardAndId.mockResolvedValue(existing);
      versionsRepository.update.mockResolvedValue(existing);
      const dtoWithOnlyStartDate: UpdateVersionDto = {
        startDate: '2026-05-01',
      };

      await expect(
        service.update(user, boardId, 5, dtoWithOnlyStartDate),
      ).resolves.toBeDefined();
      expect(versionsRepository.update).toHaveBeenCalledWith(
        5,
        dtoWithOnlyStartDate,
      );
    });

    it('should skip the date-range check when neither the dto nor the existing version has both dates', async () => {
      const existing = makeVersionRecord({
        id: 5,
        boardId,
        startDate: null,
        endDate: null,
      });
      versionsRepository.findActiveByBoardAndId.mockResolvedValue(existing);
      versionsRepository.update.mockResolvedValue(existing);

      await expect(
        service.update(user, boardId, 5, { name: 'v2.0' }),
      ).resolves.toBeDefined();
      expect(versionsRepository.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the version when it belongs to the board', async () => {
      const existing = makeVersionRecord({ id: 5, boardId });
      versionsRepository.findActiveByBoardAndId.mockResolvedValue(existing);

      const result = await service.remove(user, boardId, 5);

      expect(versionsRepository.findActiveByBoardAndId).toHaveBeenCalledWith(
        boardId,
        5,
      );
      expect(versionsRepository.delete).toHaveBeenCalledWith(5);
      expect(result).toEqual({
        deleteResult: 'Version deleted successfully!',
      });
    });

    it('should throw VERSION_NOT_FOUND 404 when the version is missing', async () => {
      versionsRepository.findActiveByBoardAndId.mockResolvedValue(null);

      await expect(service.remove(user, boardId, 999)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.VERSION_NOT_FOUND },
      });
      expect(versionsRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('ensureBelongsToBoard', () => {
    it('should return the version when it belongs to the board and is active', async () => {
      const version = makeVersionRecord({ id: 5, boardId });
      versionsRepository.findActiveByBoardAndId.mockResolvedValue(version);

      const result = await service.ensureBelongsToBoard(boardId, 5);

      expect(result).toEqual(version);
    });

    it('should throw VERSION_NOT_FOUND 404 when the version does not exist or is on another board', async () => {
      versionsRepository.findActiveByBoardAndId.mockResolvedValue(null);

      await expect(
        service.ensureBelongsToBoard(boardId, 999),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.VERSION_NOT_FOUND },
      });
    });
  });
});
