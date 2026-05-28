import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { getOffsetPagination } from '@common/utils/pagination.util';
import {
  CreateVersionDto,
  ListVersionsQueryDto,
  UpdateVersionDto,
} from '../dto/version.dto';

const versionSelect = {
  id: true,
  boardId: true,
  name: true,
  startDate: true,
  endDate: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.VersionSelect;

@Injectable()
export class VersionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByBoardAndId(boardId: number, id: number) {
    return this.prisma.version.findFirst({
      where: { id, boardId, deletedAt: null },
      select: versionSelect,
    });
  }

  async findByBoard(boardId: number, query: ListVersionsQueryDto) {
    const where: Prisma.VersionWhereInput = {
      boardId,
      deletedAt: null,
      ...(query.keyword
        ? { name: { contains: query.keyword, mode: 'insensitive' } }
        : {}),
    };
    const { skip, take } = getOffsetPagination(query);

    const [count, items] = await this.prisma.$transaction([
      this.prisma.version.count({ where }),
      this.prisma.version.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: versionSelect,
      }),
    ]);

    return { items, count };
  }

  create(boardId: number, dto: CreateVersionDto) {
    return this.prisma.version.create({
      data: {
        boardId,
        name: dto.name,
        startDate: this.toDate(dto.startDate),
        endDate: this.toDate(dto.endDate),
        description: dto.description ?? '',
      },
      select: versionSelect,
    });
  }

  update(versionId: number, dto: UpdateVersionDto) {
    return this.prisma.version.update({
      where: { id: versionId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.startDate !== undefined
          ? { startDate: this.toDate(dto.startDate) }
          : {}),
        ...(dto.endDate !== undefined
          ? { endDate: this.toDate(dto.endDate) }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
      },
      select: versionSelect,
    });
  }

  async delete(versionId: number): Promise<void> {
    await this.prisma.version.delete({
      where: { id: versionId },
    });
  }

  private toDate(value: string | undefined): Date | undefined {
    return value === undefined ? undefined : new Date(value);
  }
}
