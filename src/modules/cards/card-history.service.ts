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

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Thấp',
  2: 'Trung bình',
  3: 'Cao',
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

  // Key là nhãn hiển thị — FE render delta trực tiếp nên tên field trong
  // delta chính là tên field người dùng nhìn thấy.
  private toDiffable(snapshot: CardSnapshot) {
    return {
      'Tiêu đề': snapshot.title,
      'Mô tả': snapshot.description ?? '',
      'Độ ưu tiên': this.toPriorityLabel(snapshot.priority),
      'Trạng thái': snapshot.column.title,
      'Người thực hiện': snapshot.assignee?.displayName ?? null,
      'Loại issue': snapshot.issueType?.name ?? null,
      Milestone: snapshot.version?.name ?? null,
      'Ngày bắt đầu': this.toDateLabel(snapshot.startDate),
      'Hạn chót': this.toDateLabel(snapshot.dueDate),
      'Estimated hours': snapshot.estimatedHours,
      'Actual hours': snapshot.actualHours,
    };
  }

  private toPriorityLabel(priority: number | null): string | null {
    if (priority === null) {
      return null;
    }

    return PRIORITY_LABELS[priority] ?? String(priority);
  }

  private toDateLabel(date: Date | null): string | null {
    return date ? date.toISOString().slice(0, 10) : null;
  }
}
