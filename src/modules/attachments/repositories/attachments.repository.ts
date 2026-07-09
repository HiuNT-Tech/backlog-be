import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';

// `fileUrl`/`fileKey` không được chọn ở đây: response luôn trả link qua endpoint
// download có kiểm tra quyền, không lộ URL storage thật (xem AttachmentsService).
export const attachmentSelect = {
  id: true,
  fileName: true,
  mimeType: true,
  fileSize: true,
} satisfies Prisma.AttachmentSelect;

export type UploadedAttachmentData = {
  fileName: string;
  fileKey: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploadedByUserId?: number;
};

export type CreateAttachmentData = UploadedAttachmentData & {
  cardId?: number;
  commentId?: number;
};

@Injectable()
export class AttachmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createMany(rows: CreateAttachmentData[]) {
    return this.prisma.$transaction(
      rows.map((row) =>
        this.prisma.attachment.create({ data: row, select: attachmentSelect }),
      ),
    );
  }

  softDeleteForComment(commentId: number, ids: number[]) {
    return this.prisma.attachment.updateMany({
      where: { id: { in: ids }, commentId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  softDeleteForCard(cardId: number, ids: number[]) {
    return this.prisma.attachment.updateMany({
      where: { id: { in: ids }, cardId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  findActiveWithBoardContext(id: number) {
    return this.prisma.attachment.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        fileName: true,
        fileKey: true,
        mimeType: true,
        card: { select: { boardId: true } },
        comment: { select: { card: { select: { boardId: true } } } },
      },
    });
  }
}
