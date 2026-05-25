# Plan migrate BE cu sang be_02

## Muc tieu

Chuyen cac API/service con lai tu backend cu `/home/hiunt/Documents/Backlog/BE` sang backend NestJS moi `/home/hiunt/Documents/Backlog/be_02`, trong khi giu frontend `/home/hiunt/Documents/Backlog/FE` phai sua it nhat co the.

Trang thai hien tai:

- `be_02` da co code base NestJS, PostgreSQL, Prisma, auth, users, refresh token session, logging, guard, filter, interceptor.
- Auth FE hien dang goi `/v1/auth/*`.
- Domain nghiep vu chua migrate trong `be_02`: boards, columns/statuses, cards/issues, issue-types, versions.
- FE hien phu thuoc nhieu vao `_id`, path `/v1/...`, cookie auth, HTTP `410` khi access token het han, va response raw khong boc `{ item: ... }`.

## Nguyen tac bat buoc

1. Khong doi logic FE neu co the xu ly o BE bang compatibility layer.
2. Giu API path cu cho domain: `/v1/boards`, `/v1/columns`, `/v1/cards`.
3. Auth giu API FE hien tai: `/v1/auth/register`, `/v1/auth/login`, `/v1/auth/verify-account`, `/v1/auth/logout`, `/v1/auth/refresh_token`.
4. Response phase dau phai tra raw data giong FE dang dung, khong boc thanh `{ item: ... }`.
5. API response tra `_id` string cho tat ca entity domain, co the tra them `id` neu can.
6. DB moi dung relation/FK/transaction, nhung mapper phai giu contract FE cu.
7. Cac thao tac order/move card/column phai chay trong transaction.
8. Migrate theo tung phase, moi phase co the build/test duoc.

## Danh sach phase

| Phase | File | Noi dung |
| --- | --- | --- |
| 00 | [phase-00-compatibility-baseline.md](./phase-00-compatibility-baseline.md) | Can chinh prefix, port, cookie auth, response raw, `410`, `/v1/status`. |
| 01 | [phase-01-prisma-domain-schema.md](./phase-01-prisma-domain-schema.md) | Them Prisma schema cho boards, members, columns, cards, issue-types, versions. |
| 02 | [phase-02-boards-columns.md](./phase-02-boards-columns.md) | Migrate board va column/status endpoints. |
| 03 | [phase-03-cards-issues.md](./phase-03-cards-issues.md) | Migrate card/issue CRUD, list filters, drag/drop/move card. |
| 04 | [phase-04-issue-types-versions.md](./phase-04-issue-types-versions.md) | Migrate issue type va version settings. |
| 05 | [phase-05-data-migration.md](./phase-05-data-migration.md) | Dry-run va migrate data MongoDB sang PostgreSQL. |
| 06 | [phase-06-cutover-fe-verification.md](./phase-06-cutover-fe-verification.md) | Cutover FE sang BE moi va kiem thu cac man hinh. |
| 07 | [phase-07-hardening-cleanup.md](./phase-07-hardening-cleanup.md) | Test, permission, cleanup legacy compatibility, tai lieu van hanh. |

## Endpoint surface can giu

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

## Compatibility response bat buoc

### Board detail

```json
{
  "_id": "board-id",
  "title": "Project",
  "description": "",
  "type": "public",
  "members": [{ "userId": "1", "role": 1 }],
  "columnOrderIds": ["column-id"],
  "columns": [
    {
      "_id": "column-id",
      "boardId": "board-id",
      "title": "To Do",
      "statusColor": 7,
      "cardOrderIds": ["card-id"],
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

### Issue type/version list

```json
{
  "items": [],
  "count": 0
}
```

## Definition of done chung

- `npm run build` pass.
- `npx prisma validate` pass.
- Endpoint phase do chay duoc bang curl/Postman.
- FE man hinh lien quan khong can sua parser response.
- Khong xoa/sua logic FE tru khi da xac nhan BE khong the giu contract.
- Neu co thay doi contract bat buoc, ghi ro file FE can sua va ly do.
