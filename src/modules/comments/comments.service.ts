import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtPayload } from '@/types/jwt-payload.type';
import { BOARD_CONTRIBUTOR_ROLES } from '@modules/boards/board-access.service';
import { CardsService } from '@modules/cards/cards.service';
import { AttachmentsService } from '@modules/attachments/attachments.service';
import { UploadedFile } from '@common/upload';
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
    private readonly attachmentsService: AttachmentsService,
  ) {}

  async create(
    user: JwtPayload,
    cardId: number,
    dto: CreateCommentDto,
    files?: UploadedFile[],
  ): Promise<CommentResponseDto> {
    await this.cardsService.ensureCardAccessible(
      user,
      cardId,
      BOARD_CONTRIBUTOR_ROLES,
    );

    const content = dto.content?.trim() ?? '';
    if (!content && (!files || files.length === 0)) {
      throw new BadRequestException(
        'Comment must have content or at least one attachment.',
      );
    }

    // Upload trước, tạo comment + attachment cùng lúc (nested write) —
    // nếu upload lỗi thì chưa có gì được ghi vào DB.
    const prepared = await this.attachmentsService.uploadFiles(
      files,
      user.userId,
    );
    const comment = await this.commentsRepository.create(
      cardId,
      user.userId,
      content,
      prepared,
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
    files?: UploadedFile[],
  ): Promise<CommentResponseDto> {
    const existing = await this.commentsRepository.findActiveById(id);
    if (!existing) {
      throw new NotFoundException('Comment not found');
    }
    if (existing.userId !== user.userId) {
      throw new ForbiddenException('You can only modify your own comments');
    }

    // `content` là optional: không gửi nghĩa là "giữ nguyên", KHÔNG phải
    // "xoá về rỗng" — tránh xoá mất nội dung cũ khi client chỉ muốn
    // thêm/gỡ attachment mà không đụng vào text.
    const nextContent =
      dto.content !== undefined ? dto.content.trim() : existing.content;

    const removeIds = dto.removeAttachmentIds ?? [];
    const remainingCount = existing.attachments.filter(
      (a) => !removeIds.includes(a.id),
    ).length;
    const newFilesCount = files?.length ?? 0;

    if (!nextContent && remainingCount + newFilesCount === 0) {
      throw new BadRequestException(
        'Comment must have content or at least one attachment.',
      );
    }

    if (dto.content !== undefined) {
      await this.commentsRepository.update(id, nextContent);
    }
    await this.attachmentsService.removeFromComment(id, dto.removeAttachmentIds);
    await this.attachmentsService.addFilesToComment(id, files, user.userId);

    const updated = await this.commentsRepository.findActiveById(id);
    if (!updated) {
      throw new NotFoundException('Comment not found');
    }

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
      attachments: comment.attachments.map((attachment) =>
        this.attachmentsService.toResponse(attachment),
      ),
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
