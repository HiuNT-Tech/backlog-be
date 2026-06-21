import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';
import { JwtPayload } from '@/types/jwt-payload.type';
import {
  CreateColumnDto,
  ListColumnsQueryDto,
  UpdateColumnDto,
} from './dto/column.dto';
import {
  ColumnResponseDto,
  DeleteColumnResponseDto,
} from './dto/column-response.dto';
import { ColumnsRepository } from './repositories/columns.repository';

type ColumnRecord = NonNullable<
  Awaited<ReturnType<ColumnsRepository['findActiveById']>>
>;
type ColumnListItem = Awaited<
  ReturnType<ColumnsRepository['findByBoardId']>
>[number];

@Injectable()
export class ColumnsService {
  constructor(private readonly columnsRepository: ColumnsRepository) {}

  async findAll(
    user: JwtPayload,
    boardId: number,
    query: ListColumnsQueryDto,
  ): Promise<ColumnResponseDto[]> {
    const columns = await this.columnsRepository.findByBoardId(boardId);
    return columns.map((column) => this.toColumnResponse(column));
  }

  async create(
    user: JwtPayload,
    boardId: number,
    dto: CreateColumnDto,
  ): Promise<ColumnResponseDto> {
    const column = await this.columnsRepository.create(boardId, dto);

    return {
      ...this.toColumnResponse(column),
      cards: [],
    };
  }

  async update(
    user: JwtPayload,
    boardId: number,
    columnId: number,
    dto: UpdateColumnDto,
  ): Promise<ColumnResponseDto> {
    await this.ensureColumnBelongsToBoard(boardId, columnId);

    if (dto.cards) {
      await this.ensureCardsBelongToColumn(columnId, dto.cards);
    }

    const updatedColumn = await this.columnsRepository.update(columnId, dto);

    if (!updatedColumn) {
      throw new BusinessException(
        ErrorCode.COLUMN_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    return this.toColumnResponse(updatedColumn);
  }

  async remove(
    user: JwtPayload,
    boardId: number,
    columnId: number,
  ): Promise<DeleteColumnResponseDto> {
    await this.ensureColumnBelongsToBoard(boardId, columnId);
    await this.columnsRepository.softDeleteWithCards(columnId, boardId);

    return {
      deleteResult: 'Column and its Cards deleted successfully!',
    };
  }

  private async ensureColumnBelongsToBoard(boardId: number, columnId: number): Promise<ColumnRecord> {
    const column = await this.columnsRepository.findActiveById(columnId);

    if (!column || column.boardId !== boardId) {
      throw new BusinessException(
        ErrorCode.COLUMN_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    return column;
  }

  private async ensureCardsBelongToColumn(
    columnId: number,
    cards: { id: number; position: number }[],
  ): Promise<void> {
    const uniqueCardIds = [...new Set(cards.map((card) => card.id))];
    const matchingCount = await this.columnsRepository.countMatchingCards(
      columnId,
      uniqueCardIds,
    );

    if (matchingCount !== uniqueCardIds.length) {
      throw new BusinessException(
        ErrorCode.CARDS_NOT_BELONG_TO_COLUMN,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private toColumnResponse(
    column: ColumnRecord | ColumnListItem,
  ): ColumnResponseDto {
    return {
      id: column.id,
      boardId: column.boardId,
      title: column.title,
      statusColor: column.statusColor,
      position: column.position,
      createdAt: column.createdAt,
      updatedAt: column.updatedAt,
      ...('_count' in column ? { _count: column._count } : {}),
    };
  }
}
