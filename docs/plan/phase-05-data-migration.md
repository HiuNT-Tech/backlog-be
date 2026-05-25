# Phase 05 - Data migration

## Muc tieu

Chuyen du lieu that tu MongoDB backend cu sang PostgreSQL `be_02` mot cach co the doi soat, dry-run truoc, khong lam mat quan he board-column-card-user.

## Nguyen tac

1. Khong migrate truc tiep lan dau vao database production.
2. Luon co dry-run in report count va loi relation.
3. Giu `legacyMongoId` cho moi record migrate tu MongoDB.
4. User reference trong bang moi dung `users.id` integer.
5. Neu khong map duoc user cu, record can duoc report, khong silently gan sai.
6. Migrate theo thu tu dependency.

## Thu tu migrate

```txt
1. users da migrate/auth da xong, chi can dam bao users.legacyMongoId co du
2. boards
3. board_members
4. columns
5. issue_types
6. versions
7. cards
8. positions/order rebuild
9. verification report
```

## Input collections cu

```txt
users
boards
columns
cards
issue_types
versions
```

## Mapping id

### Users

MongoDB:

```txt
users._id
```

PostgreSQL:

```txt
users.id
users.legacy_mongo_id
```

Can co map:

```txt
mongoUserId -> postgresUserId
```

Neu user cu chua co trong PostgreSQL:

- Option A: migrate user cu vao `users`.
- Option B: fail dry-run va yeu cau migrate user truoc.

Khuyen nghi: khong tao board/card neu user member khong map duoc.

### Domain entities

Moi entity tao UUID moi va luu:

```txt
legacy_mongo_id = String(mongo._id)
```

Can co maps:

```txt
mongoBoardId -> pgBoardId
mongoColumnId -> pgColumnId
mongoIssueTypeId -> pgIssueTypeId
mongoVersionId -> pgVersionId
mongoCardId -> pgCardId
```

## Mapping field

### Board

| MongoDB | PostgreSQL |
| --- | --- |
| `_id` | `legacyMongoId` |
| `title` | `title` |
| `slug` | `slug` |
| `description` | `description` |
| `type` | `type` |
| `_destroy` | `deletedAt` neu true |
| `createdAt` | `createdAt` |
| `updatedAt` | `updatedAt` |
| `members[]` | `board_members` |
| `columnOrderIds[]` | `columns.position` |

### Board members

| MongoDB | PostgreSQL |
| --- | --- |
| `members.userId` | `userId` qua user map |
| `members.role` | `BoardMemberRole` |

Role mapping:

```txt
1 -> ADMIN
2 -> PM
3 -> MEMBER
4 -> GUEST
```

### Column

| MongoDB | PostgreSQL |
| --- | --- |
| `_id` | `legacyMongoId` |
| `boardId` | `boardId` qua board map |
| `title` | `title` |
| `statusColor` | `statusColor` |
| `cardOrderIds[]` | `cards.position` |
| `_destroy` | `deletedAt` neu true |

Position:

- Neu board co `columnOrderIds`, position theo mang do.
- Neu column khong co trong mang, append sau cung theo `createdAt`.

### Issue type

| MongoDB | PostgreSQL |
| --- | --- |
| `_id` | `legacyMongoId` |
| `boardId` | `boardId` |
| `name` | `name` |
| `statusColor` | `statusColor` |
| `_destroy` | `deletedAt` neu true |

### Version

| MongoDB | PostgreSQL |
| --- | --- |
| `_id` | `legacyMongoId` |
| `boardId` | `boardId` |
| `name` | `name` |
| `startDate` | `startDate` date |
| `endDate` | `endDate` date |
| `description` | `description` |
| `_destroy` | `deletedAt` neu true |

Date rule:

- Accept empty string/null => null.
- Accept valid date string => date-only.
- Invalid date => report loi dry-run.

### Card

| MongoDB | PostgreSQL |
| --- | --- |
| `_id` | `legacyMongoId` |
| `boardId` | `boardId` |
| `columnId` | `columnId` |
| `title` | `title` |
| `description` | `description` |
| `priorityId` | `priorityId` |
| `assigneeId` | `assigneeUserId` qua user map |
| `registeredBy` | `registeredByUserId` qua user map |
| `issueTypeId` | `issueTypeId` |
| `versionId` | `versionId` |
| `startDate` | `startDate` date |
| `dueDate` | `dueDate` date |
| `estimatedHours` | `estimatedHours` string |
| `actualHours` | `actualHours` string |
| `_destroy` | `deletedAt` neu true |

Position:

- Neu column co `cardOrderIds`, position theo mang do.
- Neu card khong co trong mang, append sau cung theo `createdAt`.

## Script de xuat

```txt
src/database/migration/mongo-to-postgres.ts
```

CLI flags:

```txt
--dry-run
--apply
--only=boards|columns|cards|issue-types|versions|all
--report=path/to/report.json
```

Khong cho chay `--apply` neu khong co confirm env:

```env
ALLOW_DATA_MIGRATION_APPLY=true
```

## Verification report

Report can co:

```json
{
  "counts": {
    "boards": { "mongo": 0, "postgres": 0 },
    "columns": { "mongo": 0, "postgres": 0 },
    "cards": { "mongo": 0, "postgres": 0 }
  },
  "missingRelations": [],
  "invalidDates": [],
  "duplicateNames": [],
  "orphanCards": [],
  "unmappedUsers": []
}
```

## Rollback

Vi moi row co `legacyMongoId`, co the rollback theo batch:

```txt
delete cards where legacy_mongo_id is not null
delete versions where legacy_mongo_id is not null
delete issue_types where legacy_mongo_id is not null
delete columns where legacy_mongo_id is not null
delete board_members where board_id in migrated boards
delete boards where legacy_mongo_id is not null
```

Khong rollback users neu users/auth da la source of truth moi, tru khi co plan rieng.

## Kiem thu sau migrate

- Count board/column/card/issue_type/version khop.
- Moi board co dung members.
- Moi board detail load du columns/cards.
- Order columns/cards dung theo MongoDB.
- Card assignee/status/issueType/version hien dung.
- Issue type `issueCount` dung.
- Khong con missing relation nghiem trong.

## Definition of done

- Dry-run report sach hoac moi loi deu co cach xu ly.
- Apply migration tren staging/dev thanh cong.
- FE doc du lieu migrate duoc.
- Co rollback script hoac cau lenh rollback da test tren dev.
