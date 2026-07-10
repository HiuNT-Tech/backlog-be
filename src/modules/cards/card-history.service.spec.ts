import { mock, MockProxy } from 'jest-mock-extended';
import { CommentType } from '@prisma/client';
import { CommentsRepository } from '@modules/comments/repositories/comments.repository';
import { CardHistoryService } from './card-history.service';

type Snapshot = Parameters<CardHistoryService['recordCardUpdate']>[2];

const makeSnapshot = (over: Partial<Snapshot> = {}): Snapshot => ({
  title: 'Card title',
  description: 'Original description',
  priority: 2,
  startDate: new Date('2026-07-01T00:00:00Z'),
  dueDate: new Date('2026-07-15T00:00:00Z'),
  estimatedHours: '4',
  actualHours: null,
  column: { title: 'To Do' },
  assignee: { displayName: 'Alice' },
  issueType: { name: 'Bug' },
  version: { name: 'v1.0' },
  ...over,
});

describe('CardHistoryService', () => {
  let service: CardHistoryService;
  let commentsRepository: MockProxy<CommentsRepository>;

  beforeEach(() => {
    commentsRepository = mock<CommentsRepository>();
    service = new CardHistoryService(commentsRepository);
  });

  const getStoredDelta = (): Record<string, unknown> => {
    const content = commentsRepository.create.mock.calls[0][2];
    return JSON.parse(content) as Record<string, unknown>;
  };

  it('should not create a comment when nothing changed', async () => {
    await service.recordCardUpdate(1, 7, makeSnapshot(), makeSnapshot());

    expect(commentsRepository.create).not.toHaveBeenCalled();
  });

  it('should create a SYSTEM comment with the changed field in the delta', async () => {
    await service.recordCardUpdate(
      1,
      7,
      makeSnapshot({ title: 'Old title' }),
      makeSnapshot({ title: 'New title' }),
    );

    expect(commentsRepository.create).toHaveBeenCalledTimes(1);
    expect(commentsRepository.create).toHaveBeenCalledWith(
      1,
      7,
      expect.any(String),
      [],
      CommentType.SYSTEM,
    );
    expect(getStoredDelta()['Tiêu đề']).toEqual(['Old title', 'New title']);
  });

  it('should store a text diff for long description changes', async () => {
    const longBase =
      'This is a long enough description that should trigger the ' +
      'character-level text diff of jsondiffpatch.\nSecond line stays.';

    await service.recordCardUpdate(
      1,
      7,
      makeSnapshot({ description: longBase }),
      makeSnapshot({ description: `${longBase}\nThird line added.` }),
    );

    const delta = getStoredDelta()['Mô tả'] as unknown[];
    // Định dạng text-diff của jsondiffpatch: [unidiff string, 0, 2]
    expect(delta).toHaveLength(3);
    expect(delta[1]).toBe(0);
    expect(delta[2]).toBe(2);
    expect(typeof delta[0]).toBe('string');
  });

  it('should store short description changes as a plain [old, new] pair', async () => {
    await service.recordCardUpdate(
      1,
      7,
      makeSnapshot({ description: 'Short before' }),
      makeSnapshot({ description: 'Short after' }),
    );

    expect(getStoredDelta()['Mô tả']).toEqual(['Short before', 'Short after']);
  });

  it('should merge multiple changed fields into a single comment', async () => {
    await service.recordCardUpdate(
      1,
      7,
      makeSnapshot(),
      makeSnapshot({
        priority: 3,
        assignee: { displayName: 'Bob' },
        column: { title: 'Doing' },
      }),
    );

    expect(commentsRepository.create).toHaveBeenCalledTimes(1);
    const delta = getStoredDelta();
    expect(delta['Độ ưu tiên']).toEqual(['Trung bình', 'Cao']);
    expect(delta['Người thực hiện']).toEqual(['Alice', 'Bob']);
    expect(delta['Trạng thái']).toEqual(['To Do', 'Doing']);
  });

  it('should record cleared fields as a change to null', async () => {
    await service.recordCardUpdate(
      1,
      7,
      makeSnapshot(),
      makeSnapshot({ assignee: null, version: null }),
    );

    const delta = getStoredDelta();
    expect(delta['Người thực hiện']).toEqual(['Alice', null]);
    expect(delta['Milestone']).toEqual(['v1.0', null]);
  });

  it('should format dates as YYYY-MM-DD in the delta', async () => {
    await service.recordCardUpdate(
      1,
      7,
      makeSnapshot(),
      makeSnapshot({ dueDate: new Date('2026-07-20T00:00:00Z') }),
    );

    expect(getStoredDelta()['Hạn chót']).toEqual(['2026-07-15', '2026-07-20']);
  });

  it('should swallow repository errors instead of failing the update', async () => {
    commentsRepository.create.mockRejectedValue(new Error('db down'));

    await expect(
      service.recordCardUpdate(
        1,
        7,
        makeSnapshot({ title: 'Old' }),
        makeSnapshot({ title: 'New' }),
      ),
    ).resolves.toBeUndefined();
  });
});
