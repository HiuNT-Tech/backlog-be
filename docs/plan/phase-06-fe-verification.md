# Phase 06 - FE verification

## Mục tiêu

Kết nối FE đã refactor với `be_02` và kiểm thử đầy đủ các màn hình liên quan. Vì không có dữ liệu production cần giữ, phase này tập trung vào smoke test, regression test theo màn hình và cách reset dữ liệu dev khi gặp lỗi.

## Điều kiện trước verification

- Phase 00 đến 04 đã merge.
- Phase 05 đã chuẩn bị database dev và seed tối thiểu nếu cần.
- BE `npm run build` pass.
- BE `npx prisma validate` pass.
- FE type-check/lint pass.
- FE không còn dùng `_id`, `columnOrderIds`, `cardOrderIds`.
- BE mới chạy ở port/path FE đang gọi hoặc FE env đã trỏ đúng BE mới.

## Chiến lược chạy local

```txt
be_02: http://localhost:8017/v1
FE: NEXT_PUBLIC_API_URL hoặc API_ROOT trỏ http://localhost:8017
```

## Smoke test API

### [ ] Status

```bash
curl http://localhost:8017/v1/status
```

### [ ] Auth

```txt
POST /v1/auth/login
GET /v1/auth/me
GET /v1/auth/refresh_token
DELETE /v1/auth/logout
```

Cần verify:

- Cookie được set.
- Protected endpoint đọc cookie.
- Token expired trả `410`.
- Refresh token retry trên FE thành công.

### [ ] Domain

```txt
GET /v1/boards
POST /v1/boards
GET /v1/boards/:id
GET /v1/columns?boardId=...
GET /v1/boards/:id/cards
GET /v1/boards/:id/issue-types
GET /v1/boards/:id/versions
```

## FE verification matrix

### [ ] Auth pages

| Page | Việc cần test |
| --- | --- |
| `/register` | Đăng ký, redirect về login với `registeredEmail`. |
| `/account/verification` | Verify email bằng link, redirect về login với `verifiedEmail`. |
| `/login` | Login thành công, cookie set, vào dashboard. |
| Logout | Clear cookie và về login. |

### [ ] Dashboard

| Flow | Expected |
| --- | --- |
| Load dashboard | Board list hiển thị đúng bằng `board.id`. |
| Create board | Board mới có 4 default statuses. |
| Click board | Vào board detail, columns/cards render đúng. |

### [ ] Board page

| Flow | Expected |
| --- | --- |
| Load board | `columns` sort theo `position`. |
| Empty column | FE tạo placeholder card, không lỗi. |
| Create card quick | Card thêm vào column, reload vẫn còn. |
| Drag card same column | Order card đúng sau reload. |
| Drag card other column | Card đổi status đúng sau reload. |
| Drag column | Column order đúng sau reload. |

### [ ] Issues

| Flow | Expected |
| --- | --- |
| Issue list | Load `{ items, total }`. |
| Search title | Kết quả đúng. |
| Filter status/assignee/issue type/version/priority | Query đúng và không lỗi. |
| Add issue | Tạo card thành công. |
| Edit issue | Update description/metadata thành công. |
| Issue detail | Assignee, column/status, version, issueType hiển thị đúng. |

### [ ] Settings

| Tab | Expected |
| --- | --- |
| Members | Load `{ total, items }`. Search/filter role được. |
| Statuses | Load columns, create/delete status được. |
| Issue Types | Load `{ items, count }`, create/edit/delete được. |
| Versions | Load `{ items, count }`, create/edit/delete được. |

## Logging cần theo dõi

- `logs/app.log`
- `logs/error.log`
- `requestId` trong response error.

Khi FE lỗi, lấy:

```txt
method
url
status
response.message
requestId
payload
```

Sau đó grep log theo requestId.

## Reset khi lỗi dữ liệu dev

Nếu dữ liệu dev sai hoặc schema thay đổi lớn:

1. Dừng `be_02`.
2. Sửa schema/seed/API liên quan.
3. Chạy lại `npx prisma migrate reset`.
4. Chạy lại seed nếu có.
5. Ghi lại endpoint lỗi và response diff trước khi fix.

## Tiêu chí hoàn tất

- FE local chạy đầy đủ auth/dashboard/board/issues/settings.
- FE không còn legacy id/order usage.
- Các API response shape khớp với type FE mới.
- Có danh sách bug nếu còn endpoint chưa khớp contract.

## Progress Summary

- **Tasks Completed:** 0/8
- **Status:** Not Started
