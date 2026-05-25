# Phase 02 - Boards va columns/statuses

## Muc tieu

Migrate board va column/status tu Express/MongoDB sang NestJS/PostgreSQL. Day la nen cho board page, dashboard va settings/statuses cua FE.

## API can implement

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

## Module/file du kien

```txt
src/modules/boards/
  boards.module.ts
  boards.controller.ts
  boards.service.ts
  dto/
  mappers/
  repositories/

src/modules/columns/
  columns.module.ts
  columns.controller.ts
  columns.service.ts
  dto/
  mappers/
  repositories/
```

## Board service

### POST /v1/boards

Payload FE:

```json
{
  "title": "Project",
  "description": "",
  "type": "public"
}
```

Logic:

1. Lay current user tu JWT cookie.
2. Validate title 3..50, description max 255, type `public/private`.
3. Tao slug tu title.
4. Tao board.
5. Tao board member cho current user role `ADMIN`.
6. Tao 4 default columns:
   - To Do, statusColor 7
   - In Progress, statusColor 5
   - Resolved, statusColor 6
   - Closed, statusColor 4
7. Tat ca nam trong `prisma.$transaction`.
8. Return board mapped raw, co `_id`, `columnOrderIds`, `columns`.

### GET /v1/boards

Logic:

1. Lay current user.
2. Query `BoardMember` theo `userId`.
3. Include board chua deleted.
4. Sort `board.updatedAt desc`.
5. Return `Board[]` raw, khong boc object.

Response toi thieu:

```json
[
  {
    "_id": "board-id",
    "title": "Project",
    "description": "",
    "type": "public",
    "members": [{ "userId": "1", "role": 1 }],
    "columnOrderIds": ["column-id"],
    "columns": []
  }
]
```

### GET /v1/boards/:id

Logic:

1. Resolve `:id` theo `id` hoac `legacyMongoId`.
2. Check board ton tai va current user la member.
3. Include columns sort `position asc`.
4. Include cards theo board, chua deleted, sort `position asc`.
5. Neu query co `assigneeId`, filter cards theo assignee.
6. Gan cards vao tung column.
7. Build `columnOrderIds` va `cardOrderIds`.
8. Return board raw.

Response bat buoc cho FE:

```txt
board._id
board.columnOrderIds
board.columns[]
board.columns[].cards[]
column._id
column.cardOrderIds
card._id
```

### PUT /v1/boards/:id

Payload FE co the gui:

```json
{
  "title": "Project",
  "description": "",
  "type": "public",
  "columnOrderIds": ["column-id-1", "column-id-2"]
}
```

Logic:

- Khong cho update `_id`, `id`, `createdAt`.
- Neu co `columnOrderIds`, update `columns.position` theo thu tu mang.
- Neu title doi, co the update slug.
- Check permission member role `ADMIN` hoac `PM`.
- Return board da update raw.

### GET /v1/boards/:id/usersBoard

Query FE:

```txt
search
role
skip
limit
```

Logic:

1. Check board ton tai.
2. Query `BoardMember` join user.
3. Filter search theo email/displayName/userCode.
4. Filter role neu co.
5. Pagination theo `skip/limit`.
6. Return `{ total, items }`.

Item response:

```json
{
  "userId": "1",
  "role": 1,
  "email": "user@example.com",
  "username": "user",
  "displayName": "User",
  "avatar": null,
  "_destroy": false,
  "createdAt": "2026-05-25T00:00:00.000Z",
  "updatedAt": null
}
```

`username` co the map tu email prefix neu DB moi khong luu username.

## Column service

### GET /v1/columns?boardId=...

Logic:

1. Validate boardId.
2. Check member.
3. Query columns cua board, chua deleted, sort position.
4. Return `Column[]` raw.

### POST /v1/columns

Payload:

```json
{
  "boardId": "board-id",
  "title": "Review",
  "statusColor": 7
}
```

Logic:

1. Check board ton tai va user co role `ADMIN/PM`.
2. Tinh `position = max(position) + 1`.
3. Create column.
4. Return column raw voi `cards: []`, `cardOrderIds: []`.

### PUT /v1/columns/:id

Payload co the gom:

```json
{
  "title": "Done",
  "statusColor": 4,
  "cardOrderIds": ["card-id-1", "card-id-2"]
}
```

Logic:

- Update title/statusColor neu co.
- Neu co `cardOrderIds`, update `cards.position` trong column theo thu tu FE gui.
- Check cards trong `cardOrderIds` deu thuoc column.
- Transaction khi reorder.
- Return column raw.

### DELETE /v1/columns/:id

Backend cu xoa column va xoa toan bo cards thuoc column. De giu behavior FE:

1. Check column ton tai.
2. Check permission `ADMIN/PM`.
3. Trong transaction:
   - Soft delete hoac hard delete cards thuoc column.
   - Soft delete hoac hard delete column.
   - Reorder lai cac column con lai neu can.
4. Return:

```json
{ "deleteResult": "Column and its Cards deleted successfully!" }
```

## Permission

Phase dau toi thieu:

| Action | Role |
| --- | --- |
| View board/list columns | Board member |
| Create/update/delete board | ADMIN, PM |
| Create/update/delete column | ADMIN, PM |
| View members | Board member |

## Kiem thu FE

- Dashboard load danh sach boards.
- Create board xong redirect vao board moi.
- Board page load columns/cards.
- Drag column reorder goi `PUT /v1/boards/:id`.
- Settings statuses load columns.
- Create/delete status chay.

## Definition of done

- Tat ca endpoint phase nay pass smoke test.
- FE dashboard va board page chay khong sua parser.
- Board detail co day du `_id`, `columnOrderIds`, `columns`, `cardOrderIds`.
- Reorder column/card trong cung column reload lai van dung thu tu.
