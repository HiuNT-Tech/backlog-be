import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardMemberRole, Prisma } from '@prisma/client';
import { JwtPayload } from '@/types/jwt-payload.type';
import { BoardAccessService } from './board-access.service';
import {
  CreateBoardDto,
  GetBoardDetailQueryDto,
  GetBoardUsersQueryDto,
  UpdateBoardDto,
} from './dto/board.dto';
import {
  BoardCardResponseDto,
  BoardColumnResponseDto,
  BoardResponseDto,
  BoardUserResponseDto,
  BoardUsersResponseDto,
} from './dto/board-response.dto';
import { BoardsRepository } from './repositories/boards.repository';

type BoardDetail = NonNullable<
  Awaited<ReturnType<BoardsRepository['findBoardDetail']>>
>;
type BoardListItem = Awaited<
  ReturnType<BoardsRepository['findBoardsByUser']>
>[number];
type BoardCard = Awaited<
  ReturnType<BoardsRepository['findBoardCards']>
>[number];

const boardManagerRoles = [BoardMemberRole.ADMIN, BoardMemberRole.PM];

@Injectable()
export class BoardsService {
  constructor(
    private readonly boardsRepository: BoardsRepository,
    private readonly boardAccessService: BoardAccessService,
  ) {}

  async create(
    user: JwtPayload,
    dto: CreateBoardDto,
  ): Promise<BoardResponseDto> {
    await this.ensureBoardCodeAvailable(dto.boardCode);
    const board = await this.handleUniqueConflict(() =>
      this.boardsRepository.createBoardWithDefaults({
        dto,
        userId: user.userId,
      }),
    );

    if (!board) {
      throw new NotFoundException('Board not found after creation');
    }

    return this.toBoardResponse(board, []);
  }

  async findAll(user: JwtPayload): Promise<BoardResponseDto[]> {
    const boards = await this.boardsRepository.findBoardsByUser(user.userId);
    return boards.map((board) => this.toBoardResponse(board, []));
  }

  async findOne(
    user: JwtPayload,
    boardId: number,
    query: GetBoardDetailQueryDto,
  ): Promise<BoardResponseDto> {
    await this.boardAccessService.ensureMember(boardId, user.userId);
    const board = await this.boardsRepository.findBoardDetail(boardId);

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const cards = await this.boardsRepository.findBoardCards(
      boardId,
      query.assigneeUserId,
    );

    return this.toBoardResponse(board, cards);
  }

  async findByCode(code: string) {
    return this.boardsRepository.findByCode(code);
  }

  async findById(id: number) {
    return this.boardsRepository.findBoardById(id);
  }

  async update(
    user: JwtPayload,
    boardId: number,
    dto: UpdateBoardDto,
  ): Promise<BoardResponseDto> {
    await this.boardAccessService.ensureRole(
      boardId,
      user.userId,
      boardManagerRoles,
    );

    const existingBoard = await this.boardsRepository.findBoardById(boardId);

    if (!existingBoard) {
      throw new NotFoundException('Board not found');
    }

    if (dto.columns) {
      await this.ensureColumnsBelongToBoard(boardId, dto.columns);
    }

    const data: {
      title?: string;
      boardCode?: string;
      description?: string;
      type?: UpdateBoardDto['type'];
    } = {};

    if (dto.title !== undefined && dto.title !== existingBoard.title) {
      data.title = dto.title;
    }

    if (
      dto.boardCode !== undefined &&
      dto.boardCode !== existingBoard.boardCode
    ) {
      const cardCount = await this.boardsRepository.countCards(boardId);

      if (cardCount > 0) {
        throw new BadRequestException(
          'Cannot update boardCode after cards have been created',
        );
      }

      await this.ensureBoardCodeAvailable(dto.boardCode, boardId);
      data.boardCode = dto.boardCode;
    }

    if (dto.description !== undefined) {
      data.description = dto.description;
    }

    if (dto.type !== undefined) {
      data.type = dto.type;
    }

    const board = await this.handleUniqueConflict(() =>
      this.boardsRepository.updateBoard(boardId, data, dto.columns),
    );

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const cards = await this.boardsRepository.findBoardCards(boardId);
    return this.toBoardResponse(board, cards);
  }

  async findUsers(
    user: JwtPayload,
    boardId: number,
    query: GetBoardUsersQueryDto,
  ): Promise<BoardUsersResponseDto> {
    await this.boardAccessService.ensureMember(boardId, user.userId);
    const result = await this.boardsRepository.findBoardUsers(boardId, query);

    return {
      total: result.total,
      items: result.items.map((item): BoardUserResponseDto => {
        const emailPrefix = item.user.email.split('@')[0] || item.user.email;

        return {
          userId: item.user.id,
          role: item.role,
          email: item.user.email,
          username: emailPrefix,
          displayName: item.user.displayName,
          avatar: item.user.avatar,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      }),
    };
  }

  private async ensureBoardCodeAvailable(
    boardCode: string,
    currentBoardId?: number,
  ): Promise<void> {
    const existing = await this.boardsRepository.findByCode(boardCode);

    if (existing && existing.id !== currentBoardId) {
      throw new ConflictException('Board code already exists');
    }
  }

  private async ensureColumnsBelongToBoard(
    boardId: number,
    columns: { id: number; position: number }[],
  ): Promise<void> {
    const uniqueColumnIds = [...new Set(columns.map((column) => column.id))];
    const matchingCount = await this.boardsRepository.countMatchingColumns(
      boardId,
      uniqueColumnIds,
    );

    if (matchingCount !== uniqueColumnIds.length) {
      throw new BadRequestException('All columns must belong to the board');
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
        throw new ConflictException('Board code already exists');
      }

      throw error;
    }
  }

  private toBoardResponse(
    board: BoardDetail | BoardListItem,
    cards: BoardCard[],
  ): BoardResponseDto {
    const cardsByColumnId = this.groupCardsByColumnId(cards);

    return {
      id: board.id,
      title: board.title,
      boardCode: board.boardCode,
      description: board.description,
      type: board.type,
      members: board.members.map((member) => ({
        userId: member.userId,
        role: member.role,
      })),
      columns: board.columns.map(
        (column): BoardColumnResponseDto => ({
          id: column.id,
          boardId: column.boardId,
          title: column.title,
          statusColor: column.statusColor,
          position: column.position,
          createdAt: column.createdAt,
          updatedAt: column.updatedAt,
          cards: cardsByColumnId.get(column.id) ?? [],
        }),
      ),
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
    };
  }

  private groupCardsByColumnId(cards: BoardCard[]) {
    const cardsByColumnId = new Map<number, BoardCardResponseDto[]>();

    for (const card of cards) {
      const list = cardsByColumnId.get(card.columnId) ?? [];
      list.push({
        id: card.id,
        boardId: card.boardId,
        columnId: card.columnId,
        cardNumber: card.cardNumber,
        cardCode: card.cardCode,
        title: card.title,
        description: card.description,
        priorityId: card.priorityId,
        assigneeUserId: card.assigneeUserId,
        position: card.position,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
      });
      cardsByColumnId.set(card.columnId, list);
    }

    return cardsByColumnId;
  }
}
