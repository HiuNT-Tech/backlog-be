# Phase 07 - Hardening và cleanup

## Mục tiêu

Sau khi FE chạy ổn với `be_02`, bổ sung test, permission chi tiết, response DTO/serializer rõ ràng và chuẩn hóa tài liệu vận hành.

## Test cần bổ sung

### [ ] Unit tests

```txt
boards.service.spec.ts
columns.service.spec.ts
cards.service.spec.ts
issue-types.service.spec.ts
versions.service.spec.ts
```

Case cần có:

- Board create tạo default columns đúng position.
- Column reorder update positions.
- Card move update positions.
- Board member role dùng enum string.
- Version date validation.
- Issue type issueCount.
- Response DTO không expose field nhạy cảm.

### [ ] E2E tests

```txt
test/e2e/boards.e2e-spec.ts
test/e2e/cards.e2e-spec.ts
test/e2e/settings.e2e-spec.ts
```

Flow cần test:

1. Register/activate/login test user.
2. Create board.
3. Create column.
4. Create card.
5. Move card.
6. Create issue type/version.
7. List cards with filters.

## [ ] Permission hardening

Phase đầu có thể chỉ check member. Phase cleanup cần siết:

| Action | Role |
| --- | --- |
| View board/card/settings | ADMIN, PM, MEMBER, GUEST |
| Create/update card | ADMIN, PM, MEMBER |
| Move card | ADMIN, PM, MEMBER |
| Create/update/delete column | ADMIN, PM |
| Create/update/delete issue type | ADMIN, PM |
| Create/update/delete version | ADMIN, PM |
| Manage members | ADMIN |
| Delete board | ADMIN |

Cần tạo helper:

```txt
BoardAccessService.ensureMember(boardId, userId)
BoardAccessService.ensureRole(boardId, userId, roles)
```

## [ ] Response hardening

Contract mới giữ raw response domain trong phase triển khai để FE đơn giản:

- `GET /v1/boards` trả `Board[]`.
- `GET /v1/boards/:id/cards` trả `{ total, items }`.
- `GET /v1/boards/:id/issue-types` và versions trả `{ items, count }`.

Sau khi ổn, nếu muốn chuẩn hóa envelope:

```json
{
  "data": {},
  "meta": {}
}
```

Chỉ làm khi có phase FE riêng. Không trộn với triển khai domain.

## [x] ID/order cleanup

Contract mới đã chọn:

- Chỉ `id`, không `_id`.
- Chỉ `position`, không `columnOrderIds` hoặc `cardOrderIds`.
- Enum string cho board type và member role.

Cleanup cần verify bằng search:

```bash
rg "_id|columnOrderIds|cardOrderIds" ../FE src
find src/modules -path "*mappers*" -type f
```

## [ ] Performance

Cần theo dõi:

- Board detail include columns/cards có chậm khi board lớn.
- Issue list filters cần index.
- Search title/name có thể cần trigram index nếu data lớn.

Index nên có:

```txt
cards(boardId, deletedAt)
cards(columnId, position)
cards(assigneeUserId)
cards(issueTypeId)
cards(versionId)
columns(boardId, position)
board_members(userId, boardId)
issue_types(boardId, name)
versions(boardId, name)
```

## [ ] Observability

- Log requestId cho error.
- Log domain action quan trọng:
  - create board
  - move card
  - delete column
  - reset/seed dữ liệu dev
- Không log password/token raw.

## [ ] Security

Cần verify:

- Cookies `httpOnly`.
- Production cookie `secure=true`, `sameSite=none` nếu cross-domain.
- CORS chỉ allow domain FE.
- Rate limit auth endpoints.
- ValidationPipe whitelist.
- Không expose `password`, `verifyToken`, refresh token hash.

## [ ] Documentation

Update:

```txt
README.md
docs/dbdiagram.dbml
.env.example
```

Cần ghi:

- Cách chạy local với FE.
- Endpoint status.
- Env cần thiết.
- Cách reset database dev.
- Cách chạy seed dữ liệu dev nếu có.

## Tiêu chí hoàn tất

- Unit/e2e tests cover core flow.
- Permission role theo board rõ ràng.
- Không còn compatibility hack không được document.
- README và env example đúng với cách FE chạy.
- Có checklist release/verification cho môi trường thật.

## Progress Summary

- **Tasks Completed:** 1/9
- **Status:** In Progress
