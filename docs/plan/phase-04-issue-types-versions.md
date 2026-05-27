# Phase 04 - Issue types và versions

## Mục tiêu

Triển khai hai nhóm API settings còn lại: issue type và version. Hai nhóm này được FE dùng trong settings, add issue, issue detail và issue filters. Contract mới chỉ dùng `id`, không dùng `_id`.

## API cần implement

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

## Module/file dự kiến

```txt
src/modules/issue-types/
  issue-types.module.ts
  issue-types.controller.ts
  issue-types.service.ts
  dto/
  repositories/

src/modules/versions/
  versions.module.ts
  versions.controller.ts
  versions.service.ts
  dto/
  repositories/
```

Không tạo `mappers/` legacy.

## Issue types

### [ ] GET /v1/boards/:id/issue-types

Query FE:

```txt
keyword
skip
limit
```

Logic:

1. Resolve board.
2. Check current user là board member.
3. Filter `name contains keyword`, case-insensitive.
4. Pagination theo `skip/limit`.
5. Sort `createdAt desc`.
6. Count cards đang dùng mỗi issue type.
7. Return:

```json
{
  "items": [
    {
      "id": 1,
      "boardId": 1,
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

Lưu ý: FE version/issue-type hooks đang đọc `count`, không phải `total`.

### [ ] POST /v1/boards/:id/issue-types

Payload:

```json
{
  "name": "Bug",
  "statusColor": 1
}
```

Logic:

- Board id lấy từ route param.
- Check permission `ADMIN/PM`.
- Validate `name` 3..50.
- Validate `statusColor` 1..10, default 1.
- Unique name theo board.
- Return item.

### [ ] PUT /v1/boards/:id/issue-types/:issueTypeId

Payload:

```json
{
  "name": "Task",
  "statusColor": 5
}
```

Logic:

- Check issue type thuộc board.
- Check permission `ADMIN/PM`.
- Validate field nếu có.
- Nếu đổi name, check unique trong board.
- Return item.

### [ ] DELETE /v1/boards/:id/issue-types/:issueTypeId

Với DB mới có FK:

- FK card.issueTypeId `onDelete: SetNull`, delete issue type vẫn thành công.
- Hoặc soft delete issue type nếu muốn bảo toàn dữ liệu settings.

Response:

```json
{ "deleteResult": "Issue type deleted successfully!" }
```

## Versions

### [ ] GET /v1/boards/:id/versions

Query FE:

```txt
keyword
skip
limit
```

Logic:

1. Resolve board.
2. Check current user là board member.
3. Filter name contains keyword.
4. Pagination `skip/limit`.
5. Sort `createdAt desc`.
6. Return:

```json
{
  "items": [
    {
      "id": 1,
      "boardId": 1,
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

### [ ] POST /v1/boards/:id/versions

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
- `startDate <= endDate` nếu cả hai có giá trị.
- Return item.

### [ ] GET /v1/boards/:id/versions/:versionId

Logic:

- Check board tồn tại.
- Check version tồn tại và thuộc board.
- Check board member.
- Return item.

### [ ] PUT /v1/boards/:id/versions/:versionId

Logic:

- Check version thuộc board.
- Merge existing + payload rồi validate `startDate <= endDate`.
- Update allowed fields: name, startDate, endDate, description.
- Return item.

### [ ] DELETE /v1/boards/:id/versions/:versionId

Để giữ behavior khi xóa version:

- FK card.versionId `onDelete: SetNull`, hoặc soft delete version.
- Return:

```json
{ "deleteResult": "Version deleted successfully!" }
```

## Kiểm thử FE

- Settings issue types list/create/edit/delete dùng `id`.
- Settings versions list/create/edit/delete dùng `id`.
- Add issue dropdown issue type/version dùng `id`.
- Issue detail hiển thị và update issue type/version đúng.

## Tiêu chí hoàn tất

- Endpoint settings pass smoke test.
- Response không chứa `_id`.
- BE không cần mapper compatibility.

## Progress Summary

- **Tasks Completed:** 0/9
- **Status:** Not Started
