import { Injectable, Logger } from '@nestjs/common';
import { create } from 'jsondiffpatch';
import { diff_match_patch } from '@dmsnell/diff-match-patch';
import { CommentType } from '@prisma/client';
import { CommentsRepository } from '@modules/comments/repositories/comments.repository';

type CardSnapshot = {
  title: string;
  description: string | null;
  priority: number | null;
  startDate: Date | null;
  dueDate: Date | null;
  estimatedHours: string | null;
  actualHours: string | null;
  column: { title: string };
  assignee: { displayName: string } | null;
  issueType: { name: string } | null;
  version: { name: string } | null;
};

// Giữ textDiff.minLength mặc định (60): field ngắn (tiêu đề, ngày, nhãn)
// ra cặp [cũ, mới] hiển thị gọn; chỉ text dài (mô tả) mới diff theo
// từ/ký tự.
const differ = create({
  textDiff: { diffMatchPatch: diff_match_patch },
});

@Injectable()
export class CardHistoryService {
  private readonly logger = new Logger(CardHistoryService.name);

  constructor(private readonly commentsRepository: CommentsRepository) {}

  /**
   * Ghi lại thay đổi của card thành một comment hệ thống (type = SYSTEM),
   * content là delta JSON của jsondiffpatch — FE render bằng formatter.
   *
   * Audit là hành động phụ: lỗi ở đây chỉ được log, không được ném ra
   * để làm fail request update chính.
   */
  async recordCardUpdate(
    cardId: number,
    actorUserId: number,
    before: CardSnapshot,
    after: CardSnapshot,
  ): Promise<void> {
    const delta = differ.diff(this.toDiffable(before), this.toDiffable(after));

    if (!delta) {
      return;
    }

    try {
      await this.commentsRepository.create(
        cardId,
        actorUserId,
        JSON.stringify(delta),
        [],
        CommentType.SYSTEM,
      );
    } catch (error) {
      this.logger.error(
        `Failed to record update history for card ${cardId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // Key phải là tên field ổn định, không phụ thuộc ngôn ngữ — FE map key
  // sang nhãn hiển thị theo i18n hiện tại của người xem khi render delta.
  // Giá trị cũng giữ nguyên dạng thô (vd priority là số) để FE tự dịch,
  // tránh cứng ngôn ngữ ở BE.
  private toDiffable(snapshot: CardSnapshot) {
    return {
      title: snapshot.title,
      description: snapshot.description ?? '',
      priority: snapshot.priority,
      status: snapshot.column.title,
      assignee: snapshot.assignee?.displayName ?? null,
      issueType: snapshot.issueType?.name ?? null,
      milestone: snapshot.version?.name ?? null,
      startDate: this.toDateLabel(snapshot.startDate),
      dueDate: this.toDateLabel(snapshot.dueDate),
      estimatedHours: snapshot.estimatedHours,
      actualHours: snapshot.actualHours,
    };
  }

  private toDateLabel(date: Date | null): string | null {
    return date ? date.toISOString().slice(0, 10) : null;
  }
}
