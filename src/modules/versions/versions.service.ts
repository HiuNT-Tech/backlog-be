import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardMemberRole } from '@prisma/client';
import { CountedResponse } from '@common/dto/response.dto';
import { JwtPayload } from '@/types/jwt-payload.type';
import { BoardAccessService } from '@modules/boards/board-access.service';
import {
  CreateVersionDto,
  ListVersionsQueryDto,
  UpdateVersionDto,
} from './dto/version.dto';
import {
  DeleteVersionResponseDto,
  VersionResponseDto,
} from './dto/version-response.dto';
import { VersionsRepository } from './repositories/versions.repository';

type VersionRecord = NonNullable<
  Awaited<ReturnType<VersionsRepository['findActiveByBoardAndId']>>
>;

const boardManagerRoles = [BoardMemberRole.ADMIN, BoardMemberRole.PM];

@Injectable()
export class VersionsService {
  constructor(
    private readonly versionsRepository: VersionsRepository,
    private readonly boardAccessService: BoardAccessService,
  ) {}

  async findAll(
    user: JwtPayload,
    boardId: number,
    query: ListVersionsQueryDto,
  ): Promise<CountedResponse<VersionResponseDto>> {
    await this.boardAccessService.ensureMember(boardId, user.userId);
    const result = await this.versionsRepository.findByBoard(boardId, query);

    return {
      items: result.items.map((version) => this.toVersionResponse(version)),
      count: result.count,
    };
  }

  async create(
    user: JwtPayload,
    boardId: number,
    dto: CreateVersionDto,
  ): Promise<VersionResponseDto> {
    await this.boardAccessService.ensureRole(
      boardId,
      user.userId,
      boardManagerRoles,
    );
    this.ensureDateRangeValid(dto.startDate, dto.endDate);

    const version = await this.versionsRepository.create(boardId, dto);
    return this.toVersionResponse(version);
  }

  async findOne(
    user: JwtPayload,
    boardId: number,
    versionId: number,
  ): Promise<VersionResponseDto> {
    await this.boardAccessService.ensureMember(boardId, user.userId);
    const version = await this.ensureBelongsToBoard(boardId, versionId);
    return this.toVersionResponse(version);
  }

  async update(
    user: JwtPayload,
    boardId: number,
    versionId: number,
    dto: UpdateVersionDto,
  ): Promise<VersionResponseDto> {
    const version = await this.ensureBelongsToBoard(boardId, versionId);
    await this.boardAccessService.ensureRole(
      boardId,
      user.userId,
      boardManagerRoles,
    );
    this.ensureDateRangeValid(
      dto.startDate ?? version.startDate,
      dto.endDate ?? version.endDate,
    );

    const updated = await this.versionsRepository.update(versionId, dto);
    return this.toVersionResponse(updated);
  }

  async remove(
    user: JwtPayload,
    boardId: number,
    versionId: number,
  ): Promise<DeleteVersionResponseDto> {
    await this.ensureBelongsToBoard(boardId, versionId);
    await this.boardAccessService.ensureRole(
      boardId,
      user.userId,
      boardManagerRoles,
    );
    await this.versionsRepository.delete(versionId);

    return {
      deleteResult: 'Version deleted successfully!',
    };
  }

  async ensureBelongsToBoard(
    boardId: number,
    versionId: number,
  ): Promise<VersionRecord> {
    const version = await this.versionsRepository.findActiveByBoardAndId(
      boardId,
      versionId,
    );

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    return version;
  }

  private ensureDateRangeValid(
    startDate: string | Date | null | undefined,
    endDate: string | Date | null | undefined,
  ): void {
    if (!startDate || !endDate) {
      return;
    }

    if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
      throw new BadRequestException(
        'startDate must be before or equal endDate',
      );
    }
  }

  private toVersionResponse(version: VersionRecord): VersionResponseDto {
    return {
      id: version.id,
      boardId: version.boardId,
      name: version.name,
      startDate: version.startDate,
      endDate: version.endDate,
      description: version.description,
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
    };
  }
}
