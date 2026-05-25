# Phase 04 - Issue types va versions

## Muc tieu

Migrate hai nhom API settings con lai: issue type va version. Hai nhom nay duoc FE dung trong settings, add issue, issue detail va issue filters.

## API can implement

### Issue types

```txt
GET /v1/boards/:id/issue-types
POST /v1/boards/:id/issue-types
PUT /v1/boards/:id/issue-types/:issueTypeId
DELETE /v1/boards/:id/issue-types/:issueTypeId
```

### Versions

```txt
GET /v1/boards/:id/versions
POST /v1/boards/:id/versions
GET /v1/boards/:id/versions/:versionId
PUT /v1/boards/:id/versions/:versionId
DELETE /v1/boards/:id/versions/:versionId
```

## Module/file du kien

```txt
src/modules/issue-types/
  issue-types.module.ts
  issue-types.controller.ts
  issue-types.service.ts
  dto/
  mappers/
  repositories/

src/modules/versions/
  versions.module.ts
  versions.controller.ts
  versions.service.ts
  dto/
  mappers/
  repositories/
```

## Issue types

### GET /v1/boards/:id/issue-types

Query FE:

```txt
keyword
skip
limit
```

Logic:

1. Resolve board.
2. Check current user la board member.
3. Filter `name contains keyword`, case-insensitive.
4. Pagination theo `skip/limit`.
5. Sort `createdAt desc`.
6. Count cards dang dung moi issue type.
7. Return:

```json
{
  "items": [
    {
      "_id": "issue-type-id",
      "boardId": "board-id",
      "name": "Bug",
      "statusColor": 1,
      "issueCount": 2,
      "createdAt": "2026-05-25T00:00:00.000Z",
      "updatedAt": null
    }
  ],
  "count": 1
}
```

Luu y: FE version/issue-type hooks dang doc `count`, khong phai `total`.

### POST /v1/boards/:id/issue-types

Payload:

```json
{
  "name": "Bug",
  "statusColor": 1,
  "boardId": "board-id"
}
```

Logic:

- Board id uu tien route param, body `boardId` chi de compatibility.
- Check permission `ADMIN/PM`.
- Validate `name` 3..50.
- Validate `statusColor` 1..10, default 1.
- Unique name theo board.
- Return item raw.

### PUT /v1/boards/:id/issue-types/:issueTypeId

Payload:

```json
{
  "name": "Task",
  "statusColor": 5
}
```

Logic:

- Check issue type thuoc board.
- Check permission `ADMIN/PM`.
- Validate field neu co.
- Neu doi name, check unique trong board.
- Return item raw.

### DELETE /v1/boards/:id/issue-types/:issueTypeId

Backend cu delete thanh cong. Voi DB moi co FK, de giu UX FE nen dung mot trong hai cach:

- Khuyen nghi phase dau: FK card.issueTypeId `onDelete: SetNull`, delete issue type van thanh cong.
- Neu muon bao toan du lieu: soft delete issue type va mapper card khong include issue type da deleted.

Response:

```json
{ "deletedCount": 1 }
```

Hoac neu dung response message:

```json
{ "deleteResult": "Issue type deleted successfully!" }
```

Can chon mot dang va giu onError FE khong phu thuoc noi dung response.

## Versions

### GET /v1/boards/:id/versions

Query FE:

```txt
keyword
skip
limit
```

Logic:

1. Resolve board.
2. Check current user la board member.
3. Filter name contains keyword.
4. Pagination `skip/limit`.
5. Sort `createdAt desc`.
6. Return:

```json
{
  "items": [
    {
      "_id": "version-id",
      "boardId": "board-id",
      "name": "v1.0",
      "startDate": "2026-05-25",
      "endDate": "2026-05-30",
      "description": "",
      "createdAt": "2026-05-25T00:00:00.000Z",
      "updatedAt": null
    }
  ],
  "count": 1
}
```

### POST /v1/boards/:id/versions

Payload:

```json
{
  "name": "v1.0",
  "startDate": "2026-05-25",
  "endDate": "2026-05-30",
  "description": ""
}
```

Logic:

- Check board.
- Check permission `ADMIN/PM`.
- Validate name 3..50.
- Validate description max 500.
- `startDate <= endDate` neu ca hai co gia tri.
- Return item raw.

### GET /v1/boards/:id/versions/:versionId

Logic:

- Check board ton tai.
- Check version ton tai va thuoc board.
- Check board member.
- Return item raw.

### PUT /v1/boards/:id/versions/:versionId

Logic:

- Check version thuoc board.
- Merge existing + payload roi validate `startDate <= endDate`.
- Update allowed fields: name, startDate, endDate, description.
- Return item raw.

### DELETE /v1/boards/:id/versions/:versionId

Backend cu delete thanh cong. De giu behavior FE:

- FK card.versionId `onDelete: SetNull`, hoac soft delete version.
- Return:

```json
{ "deleteResult": "Version deleted successfully!" }
```

## Kiem thu FE

- Settings Issue Types load list/pagination.
- Create/edit/delete issue type.
- Add issue page lay issue types de chon.
- Issue list filter theo issue type.
- Settings Versions load list/pagination.
- Create/edit/delete version.
- Add issue va issue detail lay versions de chon.
- Issue list filter theo version.

## Definition of done

- Issue type list tra `{ items, count }`.
- Version list tra `{ items, count }`.
- Date version map `YYYY-MM-DD`.
- Delete khong gay loi FK va FE refresh list duoc.
- Build pass.
