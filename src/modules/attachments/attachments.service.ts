import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@/types/jwt-payload.type';
import { UploadedFile } from '@common/upload';
import { BoardAccessService } from '@modules/boards/board-access.service';
import { StorageService, AccessTarget } from '@shared/storage/storage.service';
import { AttachmentResponseDto } from './dto/attachment-response.dto';
import {
  AttachmentsRepository,
  UploadedAttachmentData,
} from './repositories/attachments.repository';

type AttachmentRecord = {
  id: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export type DownloadTarget = AccessTarget & {
  fileName: string;
  mimeType: string;
};

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly attachmentsRepository: AttachmentsRepository,
    private readonly storageService: StorageService,
    private readonly boardAccessService: BoardAccessService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Upload file lên storage và trả metadata sẵn sàng để lưu DB.
   * KHÔNG đụng DB — dùng để ghép vào nested-write khi tạo mới comment/card,
   * đảm bảo record cha + attachment cùng thành công hoặc cùng thất bại,
   * tránh tạo "record mồ côi" nếu upload file lỗi.
   */
  async uploadFiles(
    files: UploadedFile[] | undefined,
    userId?: number,
  ): Promise<UploadedAttachmentData[]> {
    if (!files || files.length === 0) return [];

    const prepared: UploadedAttachmentData[] = [];
    for (const file of files) {
      if (!file.buffer) continue;
      const { key, url } = await this.storageService.upload({
        filename: file.originalname,
        mimeType: file.mimetype,
        buffer: file.buffer,
      });
      prepared.push({
        fileName: file.originalname,
        fileKey: key,
        fileUrl: url,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedByUserId: userId,
      });
    }
    return prepared;
  }

  /** Thêm file mới vào một comment đã tồn tại (dùng khi sửa comment). */
  async addFilesToComment(
    commentId: number,
    files: UploadedFile[] | undefined,
    userId?: number,
  ): Promise<AttachmentResponseDto[]> {
    const prepared = await this.uploadFiles(files, userId);
    if (prepared.length === 0) return [];

    const created = await this.attachmentsRepository.createMany(
      prepared.map((row) => ({ ...row, commentId })),
    );
    return created.map((attachment) => this.toResponse(attachment));
  }

  /** Thêm file mới vào một ticket đã tồn tại (dùng khi sửa ticket). */
  async addFilesToCard(
    cardId: number,
    files: UploadedFile[] | undefined,
    userId?: number,
  ): Promise<AttachmentResponseDto[]> {
    const prepared = await this.uploadFiles(files, userId);
    if (prepared.length === 0) return [];

    const created = await this.attachmentsRepository.createMany(
      prepared.map((row) => ({ ...row, cardId })),
    );
    return created.map((attachment) => this.toResponse(attachment));
  }

  async removeFromComment(commentId: number, ids?: number[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    await this.attachmentsRepository.softDeleteForComment(commentId, ids);
  }

  async removeFromCard(cardId: number, ids?: number[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    await this.attachmentsRepository.softDeleteForCard(cardId, ids);
  }

  /**
   * Kiểm tra quyền (phải là thành viên board chứa comment/card sở hữu
   * attachment) rồi trả thông tin để controller stream/redirect file.
   * Đây là cách duy nhất để truy cập nội dung file — route `/uploads` tĩnh
   * không tồn tại nữa, tránh lộ file cho người ngoài board.
   */
  async getDownloadTarget(
    user: JwtPayload,
    id: number,
  ): Promise<DownloadTarget> {
    const attachment =
      await this.attachmentsRepository.findActiveWithBoardContext(id);
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const boardId = attachment.card?.boardId ?? attachment.comment?.card.boardId;
    if (!boardId) {
      throw new NotFoundException('Attachment not found');
    }

    await this.boardAccessService.ensureMember(boardId, user.userId);

    const target = await this.storageService.getAccessTarget(
      attachment.fileKey,
    );

    return {
      ...target,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    };
  }

  toResponse(attachment: AttachmentRecord): AttachmentResponseDto {
    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileUrl: this.buildDownloadUrl(attachment.id),
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
    };
  }

  private buildDownloadUrl(id: number): string {
    const base = this.configService
      .get<string>('app.publicUrl', 'http://localhost:3000')
      .replace(/\/+$/, '');
    const prefix = this.configService
      .get<string>('app.apiPrefix', 'v1')
      .replace(/^\/+|\/+$/g, '');
    return `${base}/${prefix}/attachments/${id}/download`;
  }
}
