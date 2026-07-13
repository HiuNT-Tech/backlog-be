import { HttpStatus, Injectable } from '@nestjs/common';
import { BoardMemberRole, Prisma } from '@prisma/client';
import { BoardMembersService } from '@modules/board-members/board-members.service';
import { JwtPayload } from '@/types/jwt-payload.type';
import { BoardAccessService } from './board-access.service';
import {
  CreateBoardDto,
  DuplicateBoardDto,
  GetBoardDetailQueryDto,
  GetBoardUsersQueryDto,
  UpdateBoardDto,
  UpdateMemberRoleDto,
} from './dto/board.dto';
import {
  BoardCardResponseDto,
  BoardColumnResponseDto,
  BoardMemberResponseDto,
  BoardResponseDto,
  BoardUserResponseDto,
  BoardUsersResponseDto,
} from './dto/board-response.dto';
import { BoardsRepository } from './repositories/boards.repository';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';

type BoardDetail = NonNullable<
  Awaited<ReturnType<BoardsRepository['findBoardDetail']>>
>;
type BoardListItem = Awaited<
  ReturnType<BoardsRepository['findBoardsByUser']>
>[number];
type BoardCard = Awaited<
  ReturnType<BoardsRepository['findBoardCards']>
>[number];

@Injectable()
export class BoardsService {
  constructor(
    private readonly boardsRepository: BoardsRepository,
    private readonly boardAccessService: BoardAccessService,
    private readonly boardMembersService: BoardMembersService,
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
      throw new BusinessException(
        ErrorCode.BOARD_NOT_FOUND,
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.toBoardResponse(board, []);
  }

  /**
   * Nhân bản board nguồn (cột, loại issue, milestone, card) thành board mới
   * do người thực hiện làm ADMIN duy nhất. Không copy comment/attachment/
   * lịch sử. Quyền đọc board nguồn đã được `BoardRolesGuard`/`@BoardMember()`
   * ở controller kiểm tra trước khi vào đây.
   */
  async duplicate(
    user: JwtPayload,
    sourceBoardId: number,
    dto: DuplicateBoardDto,
  ): Promise<BoardResponseDto> {
    await this.ensureBoardCodeAvailable(dto.boardCode);

    const board = await this.handleUniqueConflict(() =>
      this.boardsRepository.duplicateBoard({
        sourceBoardId,
        dto,
        userId: user.userId,
      }),
    );

    if (!board) {
      throw new BusinessException(
        ErrorCode.BOARD_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const cards = await this.boardsRepository.findBoardCards(board.id);
    return this.toBoardResponse(board, cards);
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
    const board = await this.boardsRepository.findBoardDetail(boardId);

    if (!board) {
      throw new BusinessException(
        ErrorCode.BOARD_NOT_FOUND,
        HttpStatus.BAD_REQUEST,
      );
    }

    const cards = await this.boardsRepository.findBoardCards(
      boardId,
      query.assigneeUserId,
    );

    return this.toBoardResponse(board, cards);
  }

  async findOneByCode(
    user: JwtPayload,
    boardCode: string,
    query: GetBoardDetailQueryDto,
  ): Promise<BoardResponseDto> {
    const boardRecord =
      await this.boardsRepository.findBoardIdByCode(boardCode);
    if (!boardRecord) {
      throw new BusinessException(
        ErrorCode.BOARD_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.boardAccessService.ensureMember(boardRecord.id, user.userId);
    const board = await this.boardsRepository.findBoardDetailByCode(boardCode);

    if (!board) {
      throw new BusinessException(
        ErrorCode.BOARD_NOT_FOUND,
        HttpStatus.BAD_REQUEST,
      );
    }

    const cards = await this.boardsRepository.findBoardCards(
      board.id,
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
    const existingBoard = await this.boardsRepository.findBoardById(boardId);

    if (!existingBoard) {
      throw new BusinessException(
        ErrorCode.BOARD_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
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
        throw new BusinessException(
          ErrorCode.BOARD_CODE_UPDATE_FORBIDDEN,
          HttpStatus.BAD_REQUEST,
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
      throw new BusinessException(
        ErrorCode.BOARD_NOT_FOUND,
        HttpStatus.BAD_REQUEST,
      );
    }

    const cards = await this.boardsRepository.findBoardCards(boardId);
    return this.toBoardResponse(board, cards);
  }

  async findUsers(
    user: JwtPayload,
    boardId: number,
    query: GetBoardUsersQueryDto,
  ): Promise<BoardUsersResponseDto> {
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

  async updateMemberRole(
    user: JwtPayload,
    boardId: number,
    targetUserId: number,
    dto: UpdateMemberRoleDto,
  ): Promise<BoardMemberResponseDto> {
    const member = await this.ensureBoardMember(boardId, targetUserId);

    if (member.role === dto.role) {
      return { userId: targetUserId, role: member.role };
    }

    if (
      member.role === BoardMemberRole.ADMIN &&
      dto.role !== BoardMemberRole.ADMIN
    ) {
      await this.ensureNotLastAdmin(boardId);
    }

    const updated = await this.boardsRepository.updateMemberRole(
      member.id,
      dto.role,
    );

    return { userId: updated.userId, role: updated.role };
  }

  async removeMember(
    user: JwtPayload,
    boardId: number,
    targetUserId: number,
  ): Promise<void> {
    const member = await this.ensureBoardMember(boardId, targetUserId);

    if (member.role === BoardMemberRole.ADMIN) {
      await this.ensureNotLastAdmin(boardId);
    }

    await this.boardsRepository.softDeleteMember(member.id);
  }

  private async ensureBoardMember(boardId: number, targetUserId: number) {
    const member = await this.boardMembersService.getActiveMember(
      boardId,
      targetUserId,
    );

    if (!member) {
      throw new BusinessException(
        ErrorCode.BOARD_MEMBER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    return member;
  }

  private async ensureNotLastAdmin(boardId: number): Promise<void> {
    const adminCount = await this.boardsRepository.countActiveAdmins(boardId);

    if (adminCount <= 1) {
      throw new BusinessException(
        ErrorCode.CANNOT_REMOVE_LAST_ADMIN,
        HttpStatus.CONFLICT,
      );
    }
  }

  private async ensureBoardCodeAvailable(
    boardCode: string,
    currentBoardId?: number,
  ): Promise<void> {
    const existing = await this.boardsRepository.findByCode(boardCode);

    if (existing && existing.id !== currentBoardId) {
      throw new BusinessException(
        ErrorCode.BOARD_CODE_EXISTS,
        HttpStatus.CONFLICT,
      );
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
      throw new BusinessException(
        ErrorCode.COLUMNS_NOT_BELONG_TO_BOARD,
        HttpStatus.BAD_REQUEST,
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
          ErrorCode.BOARD_CODE_EXISTS,
          HttpStatus.CONFLICT,
        );
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
        priority: card.priority,
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
