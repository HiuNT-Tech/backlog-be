import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { getOffsetPagination } from '@common/utils/pagination.util';
import {
  CreateIssueTypeDto,
  ListIssueTypesQueryDto,
  UpdateIssueTypeDto,
} from '../dto/issue-type.dto';

const issueTypeSelect = {
  id: true,
  boardId: true,
  name: true,
  statusColor: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.IssueTypeSelect;

@Injectable()
export class IssueTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveById(id: number) {
    return this.prisma.issueType.findFirst({
      where: { id, deletedAt: null },
      select: issueTypeSelect,
    });
  }

  findActiveByBoardAndId(boardId: number, id: number) {
    return this.prisma.issueType.findFirst({
      where: { id, boardId, deletedAt: null },
      select: issueTypeSelect,
    });
  }

  findActiveByName(boardId: number, name: string) {
    return this.prisma.issueType.findFirst({
      where: {
        boardId,
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
      },
      select: { id: true },
    });
  }

  async findByBoard(boardId: number, query: ListIssueTypesQueryDto) {
    const where: Prisma.IssueTypeWhereInput = {
      boardId,
      deletedAt: null,
      ...(query.keyword
        ? { name: { contains: query.keyword, mode: 'insensitive' } }
        : {}),
    };
    const { skip, take } = getOffsetPagination(query);

    const [count, items] = await this.prisma.$transaction([
      this.prisma.issueType.count({ where }),
      this.prisma.issueType.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: issueTypeSelect,
      }),
    ]);

    const issueCounts = await this.countCardsByIssueType(
      items.map((item) => item.id),
    );

    return {
      count,
      items: items.map((item) => ({
        ...item,
        issueCount: issueCounts.get(item.id) ?? 0,
      })),
    };
  }

  create(boardId: number, dto: CreateIssueTypeDto) {
    return this.prisma.issueType.create({
      data: {
        boardId,
        name: dto.name,
        statusColor: dto.statusColor,
      },
      select: issueTypeSelect,
    });
  }

  update(issueTypeId: number, dto: UpdateIssueTypeDto) {
    return this.prisma.issueType.update({
      where: { id: issueTypeId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.statusColor !== undefined
          ? { statusColor: dto.statusColor }
          : {}),
      },
      select: issueTypeSelect,
    });
  }

  async delete(issueTypeId: number): Promise<void> {
    await this.prisma.issueType.delete({
      where: { id: issueTypeId },
    });
  }

  private async countCardsByIssueType(
    issueTypeIds: number[],
  ): Promise<Map<number, number>> {
    if (issueTypeIds.length === 0) {
      return new Map();
    }

    const counts = await this.prisma.card.groupBy({
      by: ['issueTypeId'],
      where: {
        issueTypeId: { in: issueTypeIds },
        deletedAt: null,
      },
      _count: { _all: true },
    });

    return new Map(
      counts.flatMap((count) =>
        count.issueTypeId === null
          ? []
          : [[count.issueTypeId, count._count._all]],
      ),
    );
  }
}
