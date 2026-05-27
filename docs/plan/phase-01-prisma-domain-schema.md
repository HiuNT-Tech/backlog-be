# Phase 01 - Prisma domain schema

## Mục tiêu

Thêm schema PostgreSQL cho các domain còn thiếu: board, member, column/status, card/issue, issue type, version. Schema phải có quan hệ rõ ràng bằng FK và là nguồn contract sạch cho BE/FE.

## Nguyên tắc schema

- `users.id` hiện là `Int`; các bảng member/card actor liên kết user bằng `Int`.
- Các entity domain dùng `Int @id @default(autoincrement())` làm primary key.
- Không thêm field đối soát dữ liệu cũ vì không chuyển dữ liệu MongoDB.
- Dùng `deletedAt` cho soft delete, trừ các bảng có rule hard delete tương thích.
- Lưu order bằng `position`, không lưu array order trong DB.
- Board có mã project `boardCode` unique, lưu DB là `board_code`, dùng cho ticket key như `PIPC`.
- Card có `cardNumber` theo từng board và `cardCode` unique toàn hệ thống, ví dụ `PIPC-4119`.
- Board giữ `nextCardNumber` để cấp số card trong transaction; không dùng `count(cards) + 1`.
- API contract mới:
  - Chỉ dùng `id`, không dùng `_id`.
  - Board trả `boardCode`.
  - Card trả `cardNumber` và `cardCode`.
  - Board/column/card order lấy từ `position`.
  - Không trả `columnOrderIds` hoặc `cardOrderIds`.
  - `Board.type` dùng `PUBLIC | PRIVATE`.
  - `Board.members[].role` dùng `ADMIN | PM | MEMBER | GUEST`.
- Không tạo mapper compatibility legacy trong phase này.

## Enum cần có

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

## Model đề xuất

### [x] Board

Fields chính:

```txt
id int autoincrement pk
title string max 50
boardCode string unique max 16
description string nullable max 255
type BoardType
nextCardNumber int default 1
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

### [x] BoardMember

Fields:

```txt
id int autoincrement pk
boardId int
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

### [x] Column

Column hiện đóng vai trò status.

Fields:

```txt
id int autoincrement pk
boardId int
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

### [x] IssueType

Fields:

```txt
id int autoincrement pk
boardId int
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

### [x] Version

Fields:

```txt
id int autoincrement pk
boardId int
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

### [x] Card

Fields:

```txt
id int autoincrement pk
boardId int
columnId int
cardNumber int
cardCode string unique max 40
title string max 50
description text nullable
priorityId int nullable
assigneeUserId int nullable
registeredByUserId int nullable
createdByUserId int nullable
issueTypeId int nullable
versionId int nullable
startDate date nullable
dueDate date nullable
estimatedHours string nullable
actualHours string nullable
position int
createdAt
updatedAt
deletedAt
```

Ghi chú:

- `estimatedHours` và `actualHours` phase đầu giữ string để tránh lỗi format.
- `issueTypeId` và `versionId` nên `onDelete: SetNull` để delete settings vẫn thành công.
- `columnId` cascade vì behavior cũ xóa column sẽ xóa cards.

Constraint:

```txt
index(boardId, deletedAt)
unique(boardId, cardNumber)
index(columnId, position)
index(assigneeUserId)
index(registeredByUserId)
index(createdByUserId)
index(issueTypeId)
index(versionId)
index(priorityId)
```

## [x] File migration Prisma

Tạo migration Prisma:

```bash
npm run prisma:migrate -- --name add_backlog_domain
```

Vì chưa có dữ liệu thật, database dev có thể reset khi schema thay đổi lớn. Không cần viết pipeline chuyển dữ liệu từ MongoDB.

## Response DTO sau phase này

Phase 01 không tạo DTO/service response. Khi implement API ở phase sau:

- Không return raw `User` có `password`, `verifyToken`.
- Có thể return raw Prisma domain entity nếu đã `select` đúng field an toàn.
- Nếu cần format `Date` hoặc nested relation, dùng response DTO/serializer mỏng theo từng feature.
- Không tạo mapper chỉ để đổi `id -> _id`, enum -> legacy number, hoặc `position -> orderIds`.

Date convention:

```txt
createdAt/updatedAt: ISO string hoặc Date object JSON serialize.
startDate/endDate/dueDate: "YYYY-MM-DD" nếu có, null nếu không.
```

## Kiểm thử

```bash
npx prisma validate
npm run prisma:generate
npm run build
```

Kiểm tra DB:

- Bảng mới được tạo.
- FK đến `users(id)` hợp lệ.
- Unique constraints hoạt động.

## Tiêu chí hoàn tất

- Prisma schema validate pass.
- Prisma migration tạo bảng domain thành công trên database sạch.
- Prisma client generate pass.
- Không còn mapper compatibility legacy trong `src/modules/*/mappers`.

## Progress Summary

- **Tasks Completed:** 7/7
- **Status:** Done
