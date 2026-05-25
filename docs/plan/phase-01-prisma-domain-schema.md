# Phase 01 - Prisma domain schema

## Muc tieu

Them schema PostgreSQL cho cac domain con thieu: board, member, column/status, card/issue, issue type, version. Schema phai quan he ro rang bang FK, nhung API response van map ve field FE dang dung.

## Nguyen tac schema

- `users.id` hien la `Int`; cac bang member/card actor lien ket user bang `Int`.
- Cac entity domain nen dung UUID string lam primary key de tranh xung dot khi migrate.
- Them `legacyMongoId` de doi soat va resolve link MongoDB cu.
- Dung `deletedAt` cho soft delete, tru cac bang co rule hard delete tuong thich.
- Luu order bang `position`, khong luu array order trong DB.
- Mapper API build lai:
  - `board.columnOrderIds` tu `columns.position`.
  - `column.cardOrderIds` tu `cards.position`.
  - `_id` tu `legacyMongoId ?? id`.

## Enum can co

```prisma
enum BoardType {
  PUBLIC
  PRIVATE
}

enum BoardMemberRole {
  ADMIN
  PM
  MEMBER
  GUEST
}
```

API mapper van tra:

```txt
Board.type: "public" | "private"
Board.members[].role: 1 | 2 | 3 | 4
```

Role mapping:

| API legacy | DB enum |
| --- | --- |
| 1 | ADMIN |
| 2 | PM |
| 3 | MEMBER |
| 4 | GUEST |

## Model de xuat

### Board

Fields chinh:

```txt
id uuid/string pk
legacyMongoId string unique nullable
title string max 50
slug string unique
description string nullable max 255
type BoardType
createdAt
updatedAt
deletedAt
```

Relations:

```txt
members BoardMember[]
columns Column[]
cards Card[]
issueTypes IssueType[]
versions Version[]
```

### BoardMember

Fields:

```txt
id uuid/string pk
boardId string
userId int
role BoardMemberRole
createdAt
updatedAt
deletedAt
```

Constraint:

```txt
unique(boardId, userId)
index(userId)
index(boardId)
```

### Column

Column hien dong vai tro status.

Fields:

```txt
id uuid/string pk
legacyMongoId string unique nullable
boardId string
title string max 50
statusColor int 1..10
position int
createdAt
updatedAt
deletedAt
```

Constraint:

```txt
index(boardId, position)
index(boardId)
```

### IssueType

Fields:

```txt
id uuid/string pk
legacyMongoId string unique nullable
boardId string
name string max 50
statusColor int 1..10
createdAt
updatedAt
deletedAt
```

Constraint:

```txt
unique(boardId, name)
index(boardId)
```

### Version

Fields:

```txt
id uuid/string pk
legacyMongoId string unique nullable
boardId string
name string max 50
startDate date nullable
endDate date nullable
description string max 500 default ""
createdAt
updatedAt
deletedAt
```

Constraint:

```txt
index(boardId)
index(boardId, startDate, endDate)
```

### Card

Fields:

```txt
id uuid/string pk
legacyMongoId string unique nullable
boardId string
columnId string
title string max 50
description text nullable
priorityId int nullable
assigneeUserId int nullable
registeredByUserId int nullable
createdByUserId int nullable
issueTypeId string nullable
versionId string nullable
startDate date nullable
dueDate date nullable
estimatedHours string nullable
actualHours string nullable
position int
createdAt
updatedAt
deletedAt
```

Ghi chu:

- FE hien type `estimatedHours` va `actualHours` la string, phase dau giu string de tranh loi format.
- `issueTypeId` va `versionId` nen `onDelete: SetNull` de delete settings van thanh cong.
- `columnId` nen restrict hoac cascade theo rule delete column. Vi behavior cu xoa column se xoa cards, co the cascade.

Constraint:

```txt
index(boardId, deletedAt)
index(columnId, position)
index(assigneeUserId)
index(registeredByUserId)
index(issueTypeId)
index(versionId)
index(priorityId)
```

## Migration files

Tao migration Prisma:

```bash
npm run prisma:migrate -- --name add_backlog_domain
```

Neu database dev co data tam thoi, can backup truoc khi migrate.

## Mapper compatibility can tao

```txt
src/modules/boards/mappers/board.mapper.ts
src/modules/columns/mappers/column.mapper.ts
src/modules/cards/mappers/card.mapper.ts
src/modules/issue-types/mappers/issue-type.mapper.ts
src/modules/versions/mappers/version.mapper.ts
```

Mapper bat buoc tra `_id`:

```ts
const toLegacyId = (entity) => entity.legacyMongoId ?? entity.id;
```

Date mapper:

```txt
createdAt/updatedAt: ISO string hoac timestamp deu FE parse duoc bang dayjs/new Date.
startDate/endDate/dueDate: "YYYY-MM-DD" neu co, null neu khong.
```

## Kiem thu

```bash
npx prisma validate
npm run prisma:generate
npm run build
```

Kiem tra DB:

- Bang moi duoc tao.
- FK den `users(id)` hop le.
- Unique constraints hoat dong.

## Definition of done

- Prisma schema validate pass.
- Migration tao bang domain thanh cong.
- Prisma client generate pass.
- Mapper contract duoc dinh nghia truoc khi implement service.
