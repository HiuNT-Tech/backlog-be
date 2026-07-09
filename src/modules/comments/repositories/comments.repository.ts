import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import {
  attachmentSelect,
  UploadedAttachmentData,
} from '@modules/attachments/repositories/attachments.repository';
import { ListCommentsQueryDto } from '../dto/comment.dto';

export const commentUserSelect = {
  id: true,
  email: true,
  displayName: true,
  avatar: true,
} satisfies Prisma.UserSelect;

export const commentSelect = {
  id: true,
  cardId: true,
  userId: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  user: { select: commentUserSelect },
  attachments: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: attachmentSelect,
  },
} satisfies Prisma.CommentSelect;

@Injectable()
export class CommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveById(id: number) {
    return this.prisma.comment.findFirst({
      where: { id, deletedAt: null },
      select: commentSelect,
    });
  }

  findActiveOwnershipById(id: number) {
    return this.prisma.comment.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, userId: true },
    });
  }

  async findByCard(cardId: number, query: ListCommentsQueryDto) {
    const skip = Math.max(query.skip ?? 0, 0);
    const take = Math.max(query.limit ?? 20, 1);
    const where: Prisma.CommentWhereInput = { cardId, deletedAt: null };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        select: commentSelect,
      }),
    ]);

    return { total, items };
  }

  /**
   * Tạo comment kèm attachment trong một lần ghi duy nhất (nested write).
   * Prisma bọc nested-create trong 1 transaction ngầm, nên nếu bước tạo
   * attachment lỗi thì comment cũng không được tạo — tránh sinh ra
   * comment "mồ côi" chỉ có text khi upload file thất bại giữa đường.
   */
  create(
    cardId: number,
    userId: number,
    content: string,
    attachments: UploadedAttachmentData[] = [],
  ) {
    return this.prisma.comment.create({
      data: {
        cardId,
        userId,
        content,
        attachments: { create: attachments },
      },
      select: commentSelect,
    });
  }

  update(id: number, content: string) {
    return this.prisma.comment.update({
      where: { id },
      data: { content },
      select: commentSelect,
    });
  }

  softDelete(id: number) {
    return this.prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }
}
