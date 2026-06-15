import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtPayload } from '@/types/jwt-payload.type';
import { CardsService } from '@modules/cards/cards.service';
import {
  CreateCommentDto,
  ListCommentsQueryDto,
  UpdateCommentDto,
} from './dto/comment.dto';
import {
  CommentListResponseDto,
  CommentResponseDto,
  DeleteCommentResponseDto,
} from './dto/comment-response.dto';
import { CommentsRepository } from './repositories/comments.repository';

type CommentRecord = NonNullable<
  Awaited<ReturnType<CommentsRepository['findActiveById']>>
>;

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentsRepository: CommentsRepository,
    private readonly cardsService: CardsService,
  ) {}

  async create(
    user: JwtPayload,
    cardId: number,
    dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    await this.cardsService.ensureCardAccessible(user, cardId);
    const comment = await this.commentsRepository.create(
      cardId,
      user.userId,
      dto,
    );
    return this.toResponse(comment);
  }

  async findByCard(
    user: JwtPayload,
    cardId: number,
    query: ListCommentsQueryDto,
  ): Promise<CommentListResponseDto> {
    await this.cardsService.ensureCardAccessible(user, cardId);
    const result = await this.commentsRepository.findByCard(cardId, query);

    return {
      total: result.total,
      items: result.items.map((comment) => this.toResponse(comment)),
    };
  }

  async update(
    user: JwtPayload,
    id: number,
    dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    await this.ensureCommentOwner(user, id);
    const updated = await this.commentsRepository.update(id, dto);
    return this.toResponse(updated);
  }

  async remove(
    user: JwtPayload,
    id: number,
  ): Promise<DeleteCommentResponseDto> {
    await this.ensureCommentOwner(user, id);
    await this.commentsRepository.softDelete(id);
    return { deleteResult: 'Comment deleted successfully!' };
  }

  private async ensureCommentOwner(
    user: JwtPayload,
    id: number,
  ): Promise<void> {
    const comment = await this.commentsRepository.findActiveOwnershipById(id);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== user.userId) {
      throw new ForbiddenException('You can only modify your own comments');
    }
  }

  private toResponse(comment: CommentRecord): CommentResponseDto {
    return {
      id: comment.id,
      cardId: comment.cardId,
      content: comment.content,
      user: {
        id: comment.user.id,
        email: comment.user.email,
        displayName: comment.user.displayName,
        avatar: comment.user.avatar,
      },
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
