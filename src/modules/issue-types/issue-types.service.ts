import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';
import { Prisma } from '@prisma/client';
import { CountedResponse } from '@common/dto/response.dto';
import { JwtPayload } from '@/types/jwt-payload.type';
import {
  CreateIssueTypeDto,
  ListIssueTypesQueryDto,
  UpdateIssueTypeDto,
} from './dto/issue-type.dto';
import {
  DeleteIssueTypeResponseDto,
  IssueTypeResponseDto,
} from './dto/issue-type-response.dto';
import { IssueTypesRepository } from './repositories/issue-types.repository';

type IssueTypeRecord = NonNullable<
  Awaited<ReturnType<IssueTypesRepository['findActiveByBoardAndId']>>
>;
type IssueTypeListItem = Awaited<
  ReturnType<IssueTypesRepository['findByBoard']>
>['items'][number];

@Injectable()
export class IssueTypesService {
  constructor(private readonly issueTypesRepository: IssueTypesRepository) {}

  async findAll(
    user: JwtPayload,
    boardId: number,
    query: ListIssueTypesQueryDto,
  ): Promise<CountedResponse<IssueTypeResponseDto>> {
    const result = await this.issueTypesRepository.findByBoard(boardId, query);

    return {
      items: result.items.map((item) => this.toIssueTypeResponse(item)),
      count: result.count,
    };
  }

  async create(
    user: JwtPayload,
    boardId: number,
    dto: CreateIssueTypeDto,
  ): Promise<IssueTypeResponseDto> {
    await this.ensureNameAvailable(boardId, dto.name);

    const issueType = await this.handleUniqueConflict(() =>
      this.issueTypesRepository.create(boardId, dto),
    );

    return this.toIssueTypeResponse({ ...issueType, issueCount: 0 });
  }

  async update(
    user: JwtPayload,
    boardId: number,
    issueTypeId: number,
    dto: UpdateIssueTypeDto,
  ): Promise<IssueTypeResponseDto> {
    const issueType = await this.ensureBelongsToBoard(boardId, issueTypeId);

    if (dto.name !== undefined && dto.name !== issueType.name) {
      await this.ensureNameAvailable(boardId, dto.name, issueTypeId);
    }

    const updated = await this.handleUniqueConflict(() =>
      this.issueTypesRepository.update(issueTypeId, dto),
    );

    return this.toIssueTypeResponse({ ...updated, issueCount: 0 });
  }

  async remove(
    user: JwtPayload,
    boardId: number,
    issueTypeId: number,
  ): Promise<DeleteIssueTypeResponseDto> {
    await this.ensureBelongsToBoard(boardId, issueTypeId);
    await this.issueTypesRepository.delete(issueTypeId);

    return {
      deleteResult: 'Issue type deleted successfully!',
    };
  }

  async ensureBelongsToBoard(
    boardId: number,
    issueTypeId: number,
  ): Promise<IssueTypeRecord> {
    const issueType = await this.issueTypesRepository.findActiveByBoardAndId(
      boardId,
      issueTypeId,
    );

    if (!issueType) {
      throw new BusinessException(
        ErrorCode.ISSUE_TYPE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    return issueType;
  }

  private async ensureNameAvailable(
    boardId: number,
    name: string,
    currentIssueTypeId?: number,
  ): Promise<void> {
    const existing = await this.issueTypesRepository.findActiveByName(
      boardId,
      name,
    );

    if (existing && existing.id !== currentIssueTypeId) {
      throw new BusinessException(
        ErrorCode.ISSUE_TYPE_NAME_EXISTS,
        HttpStatus.CONFLICT,
      );
    }
  }

  private async handleUniqueConflict<T>(
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
          ErrorCode.ISSUE_TYPE_NAME_EXISTS,
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }
  }

  private toIssueTypeResponse(
    issueType: IssueTypeRecord | IssueTypeListItem,
  ): IssueTypeResponseDto {
    return {
      id: issueType.id,
      boardId: issueType.boardId,
      name: issueType.name,
      statusColor: issueType.statusColor,
      issueCount: 'issueCount' in issueType ? issueType.issueCount : 0,
      createdAt: issueType.createdAt,
      updatedAt: issueType.updatedAt,
    };
  }
}
