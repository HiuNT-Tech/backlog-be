# Kế hoạch triển khai domain backlog trên be_02

## Mục tiêu

Triển khai các API/service domain backlog còn thiếu trên backend NestJS mới `/home/hiunt/Documents/Backlog/be_02` và refactor frontend `/home/hiunt/Documents/Backlog/FE` sang contract sạch, dễ bảo trì.

Backend cũ `/home/hiunt/Documents/Backlog/BE` chỉ dùng làm tài liệu tham chiếu nghiệp vụ. Dự án đang trong giai đoạn phát triển, chưa có dữ liệu thật cần giữ, nên không chuyển dữ liệu MongoDB sang PostgreSQL và không giữ các field legacy chỉ để compatibility.

## Trạng thái hiện tại

- `be_02` đã có NestJS, PostgreSQL, Prisma, auth, users, refresh token session, logging, guard, filter.
- Domain nghiệp vụ chưa triển khai đầy đủ trong `be_02`: boards, columns/statuses, cards/issues, issue-types, versions.
- FE được refactor sang `id` number, enum string và `position`; không dùng `_id`, `columnOrderIds`, `cardOrderIds`.

## Nguyên tắc bắt buộc

1. Giữ API path hiện tại cho domain: `/v1/boards`, `/v1/columns`, `/v1/cards`.
2. Auth giữ API FE hiện tại: `/v1/auth/register`, `/v1/auth/login`, `/v1/auth/verify-account`, `/v1/auth/logout`, `/v1/auth/refresh_token`.
3. Domain API trả raw data theo contract mới, không bọc `{ item: ... }` trong phase này.
4. Entity domain chỉ dùng `id: number`; không trả `_id`.
5. Order lưu và trả bằng `position`; không trả `columnOrderIds` hoặc `cardOrderIds`.
6. Board type trả enum DB: `PUBLIC | PRIVATE`.
7. Board member role trả enum DB: `ADMIN | PM | MEMBER | GUEST`.
8. Board/project có mã truy cập `boardCode`, lưu DB là `board_code`, ví dụ `PIPC`.
9. Card/issue có mã định danh ổn định `cardCode`, lưu DB là `card_code`, ví dụ `PIPC-4119`.
10. Không tạo mapper compatibility legacy. Chỉ dùng response DTO/serializer mỏng khi cần chặn field nhạy cảm hoặc format date.
11. Các thao tác reorder/move card/column và sinh `cardCode` phải chạy trong transaction.
12. Không viết pipeline chuyển dữ liệu từ MongoDB; nếu cần dữ liệu test thì dùng seed dev.
13. Triển khai theo từng phase, mỗi phase có thể build/test được.

## Danh sách phase

| Phase | Trạng thái  | File                                                                       | Nội dung                                                                       |
| ----- | ----------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 00    | Done        | [phase-00-compatibility-baseline.md](./phase-00-compatibility-baseline.md) | Căn chỉnh prefix, port, cookie auth, response raw, `410`, `/v1/status`.        |
| 01    | Done        | [phase-01-prisma-domain-schema.md](./phase-01-prisma-domain-schema.md)     | Thêm Prisma schema cho boards, members, columns, cards, issue-types, versions. |
| 02    | Done        | [phase-02-boards-columns.md](./phase-02-boards-columns.md)                 | Triển khai board và column/status endpoints theo contract `id`/`position`.     |
| 03    | Not Started | [phase-03-cards-issues.md](./phase-03-cards-issues.md)                     | Triển khai card/issue CRUD, list filters, drag/drop/move card.                 |
| 04    | Not Started | [phase-04-issue-types-versions.md](./phase-04-issue-types-versions.md)     | Triển khai issue type và version settings.                                     |
| 05    | Not Started | [phase-05-dev-data-bootstrap.md](./phase-05-dev-data-bootstrap.md)         | Reset dữ liệu dev, chạy Prisma migration và seed tối thiểu.                    |
| 06    | Not Started | [phase-06-fe-verification.md](./phase-06-fe-verification.md)               | Kết nối FE đã refactor với BE mới và kiểm thử các màn hình.                    |
| 07    | In Progress | [phase-07-hardening-cleanup.md](./phase-07-hardening-cleanup.md)           | Test, permission, response DTO, tài liệu vận hành.                             |

## Endpoint cần giữ

### Health/status

```txt
GET /v1/status
```

### Auth

```txt
POST /v1/auth/register
POST /v1/auth/login
POST /v1/auth/verify-account
DELETE /v1/auth/logout
GET /v1/auth/refresh_token
GET /v1/auth/me
```

### Boards

```txt
GET /v1/boards
POST /v1/boards
GET /v1/boards/:id
PUT /v1/boards/:id
GET /v1/boards/:id/usersBoard
GET /v1/boards/:id/cards
PUT /v1/boards/supports/moving_card
GET /v1/boards/:id/issue-types
POST /v1/boards/:id/issue-types
PUT /v1/boards/:id/issue-types/:issueTypeId
DELETE /v1/boards/:id/issue-types/:issueTypeId
GET /v1/boards/:id/versions
POST /v1/boards/:id/versions
GET /v1/boards/:id/versions/:versionId
PUT /v1/boards/:id/versions/:versionId
DELETE /v1/boards/:id/versions/:versionId
```

### Columns

```txt
GET /v1/columns?boardId=...
POST /v1/columns
PUT /v1/columns/:id
DELETE /v1/columns/:id
```

### Cards

```txt
POST /v1/cards
GET /v1/cards/:id
PUT /v1/cards/:id
```

## Response contract mới

### Board detail

```json
{
  "id": 1,
  "title": "Project",
  "boardCode": "PIPC",
  "description": "",
  "type": "PUBLIC",
  "members": [{ "userId": 1, "role": "ADMIN" }],
  "columns": [
    {
      "id": 1,
      "boardId": 1,
      "title": "To Do",
      "statusColor": 7,
      "position": 0,
      "cards": []
    }
  ]
}
```

### Card list

```json
{
  "total": 0,
  "items": []
}
```

Card item/detail tối thiểu cần trả thêm:

```json
{
  "id": 1,
  "boardId": 1,
  "columnId": 1,
  "cardNumber": 4119,
  "cardCode": "PIPC-4119",
  "title": "Issue title"
}
```

### Issue type/version list

```json
{
  "items": [],
  "count": 0
}
```

## Tiêu chí hoàn tất chung

- `npm run build` pass cho BE.
- `npx prisma validate` pass.
- FE type-check/lint không còn reference legacy `_id`, `columnOrderIds`, `cardOrderIds`.
- Endpoint của phase đó chạy được bằng curl/Postman.
- Không expose `password`, `verifyToken`, refresh token hash.
- Nếu response cần format date hoặc lọc field nhạy cảm, dùng DTO/serializer mỏng thay vì mapper compatibility.
