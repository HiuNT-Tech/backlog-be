# Phase 06 - Cutover va FE verification

## Muc tieu

Chuyen FE tu BE cu sang `be_02` voi it thay doi nhat. Phase nay tap trung vao smoke test, regression test theo man hinh va cach rollback khi gap loi.

## Dieu kien truoc cutover

- Phase 00 den 04 da merge.
- Data migration phase 05 da chay tren moi truong can test.
- `npm run build` pass.
- `npx prisma validate` pass.
- BE moi chay o port/path FE dang goi hoac FE env da tro dung BE moi.

## Chien luoc cutover local

Neu muon khong sua FE:

```txt
be_02: http://localhost:8017/v1
FE: API_ROOT van la http://localhost:8017
```

Neu muon doi bang env FE sau nay:

```txt
NEXT_PUBLIC_API_URL=http://localhost:8017
```

Nhung FE hien dang import `API_ROOT` tu `utils/constants.ts`, nen phase dau uu tien backend match port cu.

## Smoke test API

### Status

```bash
curl http://localhost:8017/v1/status
```

### Auth

```txt
POST /v1/auth/login
GET /v1/auth/me
GET /v1/auth/refresh_token
DELETE /v1/auth/logout
```

Can verify:

- Cookie duoc set.
- Protected endpoint doc cookie.
- Token expired tra `410`.
- Refresh token retry tren FE thanh cong.

### Domain

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

### Auth pages

| Page | Viec can test |
| --- | --- |
| `/register` | Dang ky, redirect ve login voi `registeredEmail`. |
| `/account/verification` | Verify email bang link, redirect ve login voi `verifiedEmail`. |
| `/login` | Login thanh cong, cookie set, vao dashboard. |
| Logout | Clear cookie va ve login. |

### Dashboard

| Flow | Expected |
| --- | --- |
| Load dashboard | Board list hien dung. |
| Create board | Board moi co 4 default statuses. |
| Click board | Vao board detail, columns/cards render dung. |

### Board page

| Flow | Expected |
| --- | --- |
| Load board | `columns` sort theo `columnOrderIds`. |
| Empty column | FE tao placeholder card, khong loi. |
| Create card quick | Card them vao column, reload van con. |
| Drag card same column | Order card dung sau reload. |
| Drag card other column | Card doi status dung sau reload. |
| Drag column | Column order dung sau reload. |

### Issues

| Flow | Expected |
| --- | --- |
| Issue list | Load `{ items, total }`. |
| Search title | Ket qua dung. |
| Filter status/assignee/issue type/version/priority | Query dung va khong loi. |
| Add issue | Tao card thanh cong. |
| Edit issue | Update description/metadata thanh cong. |
| Issue detail | Assignee, status, version, issueType hien dung. |

### Settings

| Tab | Expected |
| --- | --- |
| Members | Load `{ total, items }`. Search/filter role duoc. |
| Statuses | Load columns, create/delete status duoc. |
| Issue Types | Load `{ items, count }`, create/edit/delete duoc. |
| Versions | Load `{ items, count }`, create/edit/delete duoc. |

## Logging can theo doi

- `logs/app.log`
- `logs/error.log`
- `requestId` trong response error.

Khi FE loi, lay:

```txt
method
url
status
response.message
requestId
payload
```

Sau do grep log theo requestId.

## Rollback

Neu cutover loi nghiem trong:

1. Dung `be_02`.
2. Chay lai BE cu tren port `8017`.
3. Neu da apply data migration vao DB moi thi khong anh huong MongoDB cu.
4. Ghi lai endpoint loi va response diff truoc khi fix.

## Definition of done

- FE local chay day du auth/dashboard/board/issues/settings.
- Khong co sua logic FE lon.
- Cac API response shape khop voi hooks hien tai.
- Co danh sach bug neu con endpoint chua khop contract.
