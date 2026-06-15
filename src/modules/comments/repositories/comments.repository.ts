import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import {
  CreateCommentDto,
  ListCommentsQueryDto,
  UpdateCommentDto,
} from '../dto/comment.dto';

export const commentUserSelect = {
  id: true,
  email: true,
  displayName: true,
  avatar: true,
} satisfies Prisma.UserSelect;

export const commentSelect = {
  id: true,
  cardId: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  user: { select: commentUserSelect },
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

  create(cardId: number, userId: number, dto: CreateCommentDto) {
    return this.prisma.comment.create({
      data: { cardId, userId, content: dto.content },
      select: commentSelect,
    });
  }

  update(id: number, dto: UpdateCommentDto) {
    return this.prisma.comment.update({
      where: { id },
      data: { content: dto.content },
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
