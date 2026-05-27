# Phase 02 - Boards và columns/statuses

## Mục tiêu

Triển khai board và column/status trên NestJS/PostgreSQL theo contract mới dùng `id` và `position`. Backend cũ chỉ dùng để tham chiếu nghiệp vụ, không giữ Mongo-style response.

## API cần implement

```txt
GET /v1/boards
POST /v1/boards
GET /v1/boards/:id
PUT /v1/boards/:id
GET /v1/boards/:id/usersBoard
GET /v1/columns?boardId=...
POST /v1/columns
PUT /v1/columns/:id
DELETE /v1/columns/:id
```

## Module/file dự kiến

```txt
src/modules/boards/
  boards.module.ts
  boards.controller.ts
  boards.service.ts
  dto/
  repositories/

src/modules/columns/
  columns.module.ts
  columns.controller.ts
  columns.service.ts
  dto/
  repositories/
```

Không tạo `mappers/` legacy. Nếu cần response boundary thì đặt DTO/serializer mỏng trong `dto/` hoặc `presenters/`.

## Board service

### [x] POST /v1/boards

Payload FE mới:

```json
{
  "title": "Project",
  "boardCode": "PIPC",
  "description": "",
  "type": "PUBLIC"
}
```

Logic:

1. Lấy current user từ JWT cookie.
2. Validate title 3..50, boardCode 2..16, description max 255, type `PUBLIC/PRIVATE`.
3. Normalize `boardCode` từ FE: trim, uppercase, chỉ cho `A-Z`, `0-9`, `_`; không cho khoảng trắng/ký tự URL đặc biệt.
4. Check `boardCode` unique toàn hệ thống vì sẽ dùng để truy cập/search issue dạng `PIPC-4119`.
5. Không tạo slug; `boardCode` là mã truy cập/search project.
6. Tạo board với `boardCode` và `nextCardNumber = 1`.
7. Tạo board member cho current user role `ADMIN`.
8. Tạo 4 default columns:
   - To Do, statusColor 7, position 0
   - In Progress, statusColor 5, position 1
   - Resolved, statusColor 6, position 2
   - Closed, statusColor 4, position 3
9. Tất cả nằm trong `prisma.$transaction`.
10. Return board theo contract mới.

Ghi chú contract:

- API response dùng camelCase `boardCode`.
- Nếu FE đang gửi `board_code`, DTO có thể nhận alias tạm thời nhưng service phải normalize về field domain `boardCode`.
- Không cho update tự do `nextCardNumber` từ API.

### [x] GET /v1/boards

Logic:

1. Lấy current user.
2. Query `BoardMember` theo `userId`.
3. Include board chưa deleted.
4. Include columns chưa deleted, sort `position asc`.
5. Sort board `updatedAt desc`.
6. Return `Board[]` raw, không bọc object.

Response tối thiểu:

```json
[
  {
    "id": 1,
    "title": "Project",
    "boardCode": "PIPC",
    "description": "",
    "type": "PUBLIC",
    "members": [{ "userId": 1, "role": "ADMIN" }],
    "columns": []
  }
]
```

### [x] GET /v1/boards/:id

Logic:

1. Parse `:id` thành int.
2. Check board tồn tại và current user là member.
3. Include columns chưa deleted, sort `position asc`.
4. Include cards chưa deleted theo board, sort `position asc`.
5. Nếu query có `assigneeUserId`, filter cards theo assignee.
6. Gán cards vào từng column.
7. Return board với `columns[].cards[]`, mỗi column/card có `position`.

Response bắt buộc cho FE mới:

```txt
board.id
board.boardCode
board.columns[]
board.columns[].position
board.columns[].cards[]
column.id
card.id
card.cardCode
card.cardNumber
card.position
```

### [x] PUT /v1/boards/:id

Payload FE mới có thể gửi:

```json
{
  "title": "Project",
  "boardCode": "PIPC",
  "description": "",
  "type": "PUBLIC",
  "columns": [
    { "id": 1, "position": 0 },
    { "id": 2, "position": 1 }
  ]
}
```

Logic:

- Không cho update `id`, `createdAt`, `createdByUserId`.
- Nếu update `boardCode`, chỉ cho khi không có card hoặc phải chốt policy đổi mã:
  - Khuyến nghị phase đầu: chặn đổi `boardCode` sau khi board đã có card để tránh đổi toàn bộ ticket key.
  - Nếu board chưa có card, cho đổi và validate unique giống create board.
- Nếu có `columns`, update `columns.position` theo payload.
- Nếu title đổi, chỉ update title; không còn slug trong hệ thống.
- Check permission member role `ADMIN` hoặc `PM`.
- Transaction khi reorder.
- Return board đã update theo contract mới.

### [x] GET /v1/boards/:id/usersBoard

Query FE:

```txt
search
role
skip
limit
```

Logic:

1. Check board tồn tại.
2. Query `BoardMember` join user.
3. Filter search theo email/displayName/userCode.
4. Filter role enum nếu có.
5. Pagination theo `skip/limit`.
6. Return `{ total, items }`.

Item response:

```json
{
  "userId": 1,
  "role": "ADMIN",
  "email": "user@example.com",
  "username": "user",
  "displayName": "User",
  "avatar": null,
  "createdAt": "2026-05-25T00:00:00.000Z",
  "updatedAt": null
}
```

`username` có thể map từ email prefix nếu DB mới không lưu username.

## Column service

### [x] GET /v1/columns?boardId=...

Logic:

1. Validate boardId.
2. Check member.
3. Query columns của board, chưa deleted, sort position.
4. Include `_count.cards` hoặc cards nếu settings cần số issue.
5. Return `Column[]`.

### [x] POST /v1/columns

Payload:

```json
{
  "boardId": 1,
  "title": "Review",
  "statusColor": 7
}
```

Logic:

1. Check board tồn tại và user có role `ADMIN/PM`.
2. Tính `position = max(position) + 1`.
3. Create column.
4. Return column với `cards: []`.

### [x] PUT /v1/columns/:id

Payload có thể gồm:

```json
{
  "title": "Done",
  "statusColor": 4,
  "cards": [
    { "id": 1, "position": 0 },
    { "id": 2, "position": 1 }
  ]
}
```

Logic:

- Update title/statusColor nếu có.
- Nếu có `cards`, update `cards.position` trong column theo payload.
- Check cards trong payload đều thuộc column.
- Transaction khi reorder.
- Return column.

### [x] DELETE /v1/columns/:id

Để giữ behavior khi xóa column:

1. Check column tồn tại.
2. Check permission `ADMIN/PM`.
3. Trong transaction:
   - Soft delete hoặc hard delete cards thuộc column.
   - Soft delete hoặc hard delete column.
   - Reorder lại các column còn lại nếu cần.
4. Return:

```json
{ "deleteResult": "Column and its Cards deleted successfully!" }
```

## Permission

Phase đầu tối thiểu:

| Action                      | Role         |
| --------------------------- | ------------ |
| View board/list columns     | Board member |
| Create/update/delete board  | ADMIN, PM    |
| Create/update/delete column | ADMIN, PM    |
| View members                | Board member |

## Kiểm thử FE

- Dashboard load danh sách boards bằng `id`.
- Create board xong redirect vào board mới.
- Board page load columns/cards sort theo `position`.
- Drag column reorder gửi `{ columns: [{ id, position }] }`.
- Settings statuses load columns.
- Create/delete status chạy.

## Tiêu chí hoàn tất

- Tất cả endpoint phase này pass smoke test.
- FE dashboard và board page không còn dùng `_id` hoặc order arrays.
- Board detail có `columns`, `columns[].position`, `columns[].cards`, `cards[].position`.
- Reorder column/card trong cùng column reload lại vẫn đúng thứ tự.

## Progress Summary

- **Tasks Completed:** 9/9
- **Status:** Done
