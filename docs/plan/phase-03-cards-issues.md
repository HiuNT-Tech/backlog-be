# Phase 03 - Cards va issues

## Muc tieu

Migrate phan issue/card: tao card, xem detail, cap nhat, list issue co filter/pagination, va drag/drop card giua cac status.

## API can implement

```txt
POST /v1/cards
GET /v1/cards/:id
PUT /v1/cards/:id
GET /v1/boards/:id/cards
PUT /v1/boards/supports/moving_card
```

## Module/file du kien

```txt
src/modules/cards/
  cards.module.ts
  cards.controller.ts
  cards.service.ts
  dto/
  mappers/
  repositories/
```

## POST /v1/cards

Payload FE:

```json
{
  "boardId": "board-id",
  "columnId": "column-id",
  "title": "Issue title",
  "description": "",
  "priorityId": 2,
  "assigneeId": "1",
  "issueTypeId": "issue-type-id",
  "versionId": "version-id",
  "startDate": "2026-05-25",
  "dueDate": "2026-05-30",
  "estimatedHours": "4",
  "actualHours": "2"
}
```

Validation:

- `boardId`, `columnId`, `title` bat buoc.
- Title 3..50.
- Board ton tai va current user la member.
- Column thuoc board.
- Assignee neu co phai la member cua board.
- Issue type neu co phai thuoc board.
- Version neu co phai thuoc board.
- `startDate <= dueDate` neu ca hai co gia tri.
- `priorityId` neu co nam trong `1,2,3`.

Logic:

1. Resolve all ids.
2. Tinh `position = max(position) + 1` trong column.
3. Set `registeredByUserId` hoac `createdByUserId` bang current user.
4. Create card.
5. Return card raw mapped detail.

Response can co:

```txt
_id
boardId
columnId
title
description
priorityId
assigneeId
assignee
issueTypeId
issueType
status
versionId
startDate
dueDate
estimatedHours
actualHours
createdAt
updatedAt
```

## GET /v1/cards/:id

Logic:

1. Resolve card id theo `id` hoac `legacyMongoId`.
2. Check current user la member board cua card.
3. Include:
   - assignee user.
   - issue type.
   - column/status.
   - version.
   - registeredBy/createdBy neu co.
4. Return card raw.

`status` response:

```json
{
  "_id": "column-id",
  "boardId": "board-id",
  "title": "To Do",
  "statusColor": 7
}
```

`issueType` response:

```json
{
  "_id": "issue-type-id",
  "boardId": "board-id",
  "name": "Bug",
  "statusColor": 1
}
```

## PUT /v1/cards/:id

Payload co the gom:

```json
{
  "title": "New title",
  "description": "New desc",
  "columnId": "column-id",
  "priorityId": 3,
  "assigneeId": "1",
  "issueTypeId": "issue-type-id",
  "versionId": "version-id",
  "startDate": "2026-05-25",
  "dueDate": "2026-05-30",
  "estimatedHours": "5",
  "actualHours": "3"
}
```

Logic:

- Khong cho update `_id`, `id`, `boardId`, `createdAt`, `createdById`.
- Check permission board member.
- Validate foreign keys thuoc cung board.
- Neu doi `columnId`, tinh position cuoi column moi hoac giu theo move endpoint neu payload la drag/drop.
- Update trong transaction neu doi column/position.
- Return card detail raw.

## GET /v1/boards/:id/cards

Query FE:

```txt
search
priorityId
issueTypeId
columnId
assigneeId
registeredBy
versionId
startDate
dueDate
skip
limit
```

Yeu cau:

- Cac filter id co the la string don, string CSV, hoac array.
- `priorityId` co the la string/number/CSV.
- `search` filter theo title contains, case-insensitive.
- Pagination dung `skip/limit`, default `skip=0`, `limit=10`.
- Sort newest: `createdAt desc`.

Response:

```json
{
  "total": 0,
  "items": []
}
```

Moi item can include:

```txt
_id
boardId
columnId
title
priorityId
assigneeId
assignee
status
issueTypeId
issueType
versionId
startDate
dueDate
estimatedHours
actualHours
registeredBy
createdAt
updatedAt
```

## PUT /v1/boards/supports/moving_card

Payload FE:

```json
{
  "currentCardId": "card-id",
  "prevColumnId": "column-id-1",
  "prevCardOrderIds": ["card-id-a", "card-id-b"],
  "nextColumnId": "column-id-2",
  "nextCardOrderIds": ["card-id-c", "card-id"]
}
```

Logic:

1. Resolve current card.
2. Resolve prev/next column.
3. Dam bao prev/next column cung board voi card.
4. Check current user la board member.
5. Transaction:
   - Update current card `columnId = nextColumnId`.
   - Update position cards trong `prevCardOrderIds`.
   - Update position cards trong `nextCardOrderIds`.
6. Return:

```json
{ "updateResult": "Successfully!" }
```

Ghi chu:

- FE drag/drop trong cung column co the goi `PUT /v1/columns/:id` voi `cardOrderIds`. Phase 02 da cover.
- Drag/drop khac column goi endpoint moving_card.

## Mapper card

Can helper:

```txt
mapCard(card, includes)
mapCardStatus(column)
mapCardIssueType(issueType)
mapCardAssignee(user)
```

User pick fields:

```txt
_id
id
email
username
displayName
avatar
userCode
role
isActive
createdAt
updatedAt
```

`_id` user co the map thanh String(user.id) neu user moi khong co legacyMongoId.

## Kiem thu FE

- Add issue page tao card duoc.
- Tao card nhanh trong column popup duoc.
- Board detail reload sau create card van dung order.
- Issue list load `items/total`.
- Filter issue theo status, assignee, issue type, version.
- Issue detail load va edit metadata/description.
- Drag/drop card trong cung column va khac column, reload van dung.

## Definition of done

- Tat ca endpoint card pass smoke test.
- Board detail, issue list, issue detail chay voi response raw.
- Move card transaction khong lam sai position.
- Build pass.
