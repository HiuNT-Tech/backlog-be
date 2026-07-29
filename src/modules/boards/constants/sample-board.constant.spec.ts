import {
  DEFAULT_COLUMNS,
  SAMPLE_BOARD_CARDS,
  SAMPLE_BOARD_DESCRIPTION,
  SAMPLE_BOARD_ISSUE_TYPES,
  SAMPLE_BOARD_LOCALES,
  SAMPLE_BOARD_VERSIONS,
} from './index';

/**
 * Nội dung project mẫu là dữ liệu tay, sẽ được sửa/thêm về sau. Các test dưới
 * đây chặn những lỗi chỉ lộ ra khi thật sự ghi vào DB: chuỗi dài quá giới hạn
 * VarChar của Prisma, hoặc index trỏ ra ngoài mảng cột/loại issue/milestone.
 */
describe('sample board content', () => {
  // Giới hạn lấy từ prisma/schema.prisma.
  const CARD_TITLE_MAX = 50;
  const ISSUE_TYPE_NAME_MAX = 50;
  const VERSION_NAME_MAX = 50;
  const VERSION_DESCRIPTION_MAX = 500;
  const BOARD_DESCRIPTION_MAX = 255;

  it('should keep every board description within the Board.description limit', () => {
    for (const locale of SAMPLE_BOARD_LOCALES) {
      expect(SAMPLE_BOARD_DESCRIPTION[locale].length).toBeLessThanOrEqual(
        BOARD_DESCRIPTION_MAX,
      );
    }
  });

  it('should keep every issue type name within the IssueType.name limit and unique', () => {
    const names = SAMPLE_BOARD_ISSUE_TYPES.map((issueType) => issueType.name);

    names.forEach((name) => {
      expect(name.length).toBeLessThanOrEqual(ISSUE_TYPE_NAME_MAX);
    });
    // Prisma có @@unique([boardId, name]) — tên trùng sẽ làm cả transaction fail.
    expect(new Set(names).size).toBe(names.length);
  });

  it('should keep every milestone name and description within their limits and names unique', () => {
    const names = SAMPLE_BOARD_VERSIONS.map((version) => version.name);

    SAMPLE_BOARD_VERSIONS.forEach((version) => {
      expect(version.name.length).toBeLessThanOrEqual(VERSION_NAME_MAX);
      for (const locale of SAMPLE_BOARD_LOCALES) {
        expect(version.description[locale].length).toBeLessThanOrEqual(
          VERSION_DESCRIPTION_MAX,
        );
      }
    });
    expect(new Set(names).size).toBe(names.length);
  });

  it('should keep every card title within the Card.title limit in all locales', () => {
    SAMPLE_BOARD_CARDS.forEach((card) => {
      for (const locale of SAMPLE_BOARD_LOCALES) {
        expect(card.title[locale].length).toBeLessThanOrEqual(CARD_TITLE_MAX);
      }
    });
  });

  it('should only reference columns, issue types and milestones that exist', () => {
    SAMPLE_BOARD_CARDS.forEach((card) => {
      expect(card.columnIndex).toBeGreaterThanOrEqual(0);
      expect(card.columnIndex).toBeLessThan(DEFAULT_COLUMNS.length);
      expect(card.issueTypeIndex).toBeGreaterThanOrEqual(0);
      expect(card.issueTypeIndex).toBeLessThan(SAMPLE_BOARD_ISSUE_TYPES.length);
      expect(card.versionIndex).toBeGreaterThanOrEqual(0);
      expect(card.versionIndex).toBeLessThan(SAMPLE_BOARD_VERSIONS.length);
    });
  });

  it('should spread the sample cards over every column so no column looks empty', () => {
    const usedColumns = new Set(
      SAMPLE_BOARD_CARDS.map((card) => card.columnIndex),
    );

    expect(usedColumns.size).toBe(DEFAULT_COLUMNS.length);
  });

  it('should use every issue type at least once so all of them are illustrated', () => {
    const usedIssueTypes = new Set(
      SAMPLE_BOARD_CARDS.map((card) => card.issueTypeIndex),
    );

    expect(usedIssueTypes.size).toBe(SAMPLE_BOARD_ISSUE_TYPES.length);
  });
});
