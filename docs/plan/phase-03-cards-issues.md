# Phase 03 - Cards và issues

## Mục tiêu

Triển khai phần issue/card: tạo card, xem detail, cập nhật, list issue có filter/pagination, và drag/drop card giữa các status theo contract mới dùng `id` và `position`.

## API cần implement

```txt
POST /v1/cards
GET /v1/cards/:id
PUT /v1/cards/:id
GET /v1/boards/:id/cards
PUT /v1/boards/supports/moving_card
```

## Module/file dự kiến

```txt
src/modules/cards/
  cards.module.ts
  cards.controller.ts
  cards.service.ts
  dto/
  repositories/
```

Không tạo mapper legacy. Service/repository dùng Prisma relation và response DTO mỏng nếu cần lọc field.

## [x] POST /v1/cards

Payload FE mới:

```json
{
  "boardId": 1,
  "columnId": 1,
  "title": "Issue title",
  "description": "",
  "priorityId": 2,
  "assigneeUserId": 1,
  "issueTypeId": 1,
  "versionId": 1,
  "startDate": "2026-05-25",
  "dueDate": "2026-05-30",
  "estimatedHours": "4",
  "actualHours": "2"
}
```

Validation:

- `boardId`, `columnId`, `title` bắt buộc.
- Title 3..50.
- Board tồn tại và current user là member.
- Column thuộc board.
- Assignee nếu có phải là member của board.
- Issue type nếu có phải thuộc board.
- Version nếu có phải thuộc board.
- `startDate <= dueDate` nếu cả hai có giá trị.
- `priorityId` nếu có nằm trong `1,2,3`.

Logic:

1. Resolve all ids.
2. Tính `position = max(position) + 1` trong column.
3. Reserve số card bằng atomic update trong transaction:
   - `board.update({ data: { nextCardNumber: { increment: 1 } } })`.
   - Nếu Prisma trả `nextCardNumber` sau increment, `cardNumber = nextCardNumber - 1`.
4. Gán `cardCode = board.boardCode + '-' + cardNumber`, ví dụ `PIPC-4119`.
5. Không read `nextCardNumber` rồi update bằng hai thao tác rời ngoài transaction.
6. Create card với `cardNumber`, `cardCode`, `position`.
7. Set `registeredByUserId` và `createdByUserId` bằng current user.
8. Return card detail.

Ghi chú sequence:

- Không dùng `count(cards) + 1` vì hai request tạo card đồng thời có thể sinh trùng code.
- Tất cả bước reserve số, tạo `cardCode`, và create card phải nằm trong `prisma.$transaction`.
- `cards.cardCode` unique toàn hệ thống để hỗ trợ truy cập/search nhanh theo mã issue.
- `cards.cardNumber` unique theo board để giữ thứ tự `PIPC-1`, `PIPC-2`, ...

Response cần có:

```txt
id
boardId
columnId
cardNumber
cardCode
title
description
priorityId
assigneeUserId
assignee
issueTypeId
issueType
column
versionId
startDate
dueDate
estimatedHours
actualHours
position
createdAt
updatedAt
```

## [x] GET /v1/cards/:id

Logic:

1. Parse card id thành int.
2. Check current user là member board của card.
3. Include:
   - assignee user.
   - issue type.
   - column/status.
   - version.
   - registeredBy/createdBy nếu có.
4. Return card detail.

`column` response:

```json
{
  "id": 1,
  "boardId": 1,
  "title": "To Do",
  "statusColor": 7,
  "position": 0
}
```

`issueType` response:

```json
{
  "id": 1,
  "boardId": 1,
  "name": "Bug",
  "statusColor": 1
}
```

## [x] PUT /v1/cards/:id

Payload có thể gồm:

```json
{
  "title": "New title",
  "description": "New desc",
  "columnId": 1,
  "priorityId": 3,
  "assigneeUserId": 1,
  "issueTypeId": 1,
  "versionId": 1,
  "startDate": "2026-05-25",
  "dueDate": "2026-05-30",
  "estimatedHours": "5",
  "actualHours": "3"
}
```

Logic:

- Không cho update `id`, `boardId`, `createdAt`, `createdByUserId`.
- Không cho update `cardNumber` hoặc `cardCode`; đây là mã định danh ổn định của ticket.
- Check permission board member.
- Validate foreign keys thuộc cùng board.
- Nếu đổi `columnId`, tính position cuối column mới hoặc giữ theo move endpoint nếu payload là drag/drop.
- Update trong transaction nếu đổi column/position.
- Return card detail.

## [x] GET /v1/boards/:id/cards

Query FE mới:

```txt
search
cardCode
priorityId
issueTypeId
columnId
assigneeUserId
registeredByUserId
versionId
startDate
dueDate
skip
limit
```

Yêu cầu:

- Các filter id có thể là string đơn, string CSV, hoặc array.
- `priorityId` có thể là string/number/CSV.
- `search` filter theo title hoặc `cardCode` contains, case-insensitive.
- `cardCode` filter exact hoặc prefix, ví dụ `PIPC-4119` hoặc `PIPC`.
- Pagination dùng `skip/limit`, default `skip=0`, `limit=10`.
- Sort newest: `createdAt desc`.

Response:

```json
{
  "total": 0,
  "items": []
}
```

Mỗi item cần include:

```txt
id
boardId
columnId
cardNumber
cardCode
title
priorityId
assigneeUserId
assignee
column
issueTypeId
issueType
versionId
startDate
dueDate
estimatedHours
actualHours
registeredBy
registeredByUserId
createdAt
updatedAt
position
```

## [x] PUT /v1/boards/supports/moving_card

Payload FE mới:

```json
{
  "currentCardId": 1,
  "prevColumnId": 1,
  "prevCards": [{ "id": 2, "position": 0 }],
  "nextColumnId": 2,
  "nextCards": [
    { "id": 3, "position": 0 },
    { "id": 1, "position": 1 }
  ]
}
```

Logic:

1. Resolve current card.
2. Resolve prev/next column.
3. Đảm bảo prev/next column cùng board với card.
4. Check current user là board member.
5. Transaction:
   - Update current card `columnId = nextColumnId`.
   - Update position cards trong `prevCards`.
   - Update position cards trong `nextCards`.
6. Return:

```json
{ "updateResult": "Successfully!" }
```

Ghi chú:

- FE drag/drop trong cùng column gọi `PUT /v1/columns/:id` với `cards: [{ id, position }]`.
- Drag/drop khác column gọi endpoint moving_card.

## Kiểm thử FE

- Add issue page tạo card được.
- Tạo card nhanh trong column popup được.
- Board detail reload sau create card vẫn đúng order bằng `position`.
- Issue list load `items/total`.
- Filter issue theo status, assignee, issue type, version.
- Issue detail load và edit metadata/description.
- Drag/drop card trong cùng column và khác column, reload vẫn đúng.

## Tiêu chí hoàn tất

- Tất cả endpoint card pass smoke test.
- Board detail, issue list, issue detail chạy với response raw contract mới.
- Move card transaction không làm sai position.
- Build pass.

## Progress Summary

- **Tasks Completed:** 5/5
- **Status:** Backend implemented
- **Verification:** `npm run build` passed; API docs checker passed.
