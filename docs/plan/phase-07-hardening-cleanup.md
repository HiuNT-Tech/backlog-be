# Phase 07 - Hardening va cleanup

## Muc tieu

Sau khi FE chay on voi `be_02`, bo sung test, permission chi tiet, cleanup compatibility tam thoi va chuan hoa tai lieu van hanh.

## Test can bo sung

### Unit tests

```txt
boards.service.spec.ts
columns.service.spec.ts
cards.service.spec.ts
issue-types.service.spec.ts
versions.service.spec.ts
```

Case can co:

- Mapper tra `_id`.
- Role mapping board member.
- Board create tao default columns.
- Column reorder update positions.
- Card move update positions.
- Version date validation.
- Issue type issueCount.

### E2E tests

```txt
test/e2e/boards.e2e-spec.ts
test/e2e/cards.e2e-spec.ts
test/e2e/settings.e2e-spec.ts
```

Flow can test:

1. Register/activate/login test user.
2. Create board.
3. Create column.
4. Create card.
5. Move card.
6. Create issue type/version.
7. List cards with filters.

## Permission hardening

Phase dau co the chi check member. Phase cleanup can siết:

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

Can tao helper:

```txt
BoardAccessService.ensureMember(boardId, userId)
BoardAccessService.ensureRole(boardId, userId, roles)
```

## Response cleanup

Compatibility phase dau giu raw response. Sau khi FE da on co 2 lua chon:

### Lua chon A - Giu raw response lau dai

Phu hop neu FE dang don gian, khong muon refactor.

### Lua chon B - Chuan hoa response moi

Chi lam khi co time sua FE:

```json
{
  "item": {}
}
```

Hoac:

```json
{
  "data": {},
  "meta": {}
}
```

Neu chon B, can tao phase FE rieng, khong lam chung voi backend migration.

## ID cleanup

Phase dau response tra `_id`. Sau khi on co the:

1. FE tiep tuc dung `_id` lau dai.
2. FE refactor dan sang `id`, backend tra ca `_id` va `id`.

Khuyen nghi: tra ca hai trong thoi gian dai.

## Performance

Can theo doi:

- Board detail include columns/cards co cham khi board lon.
- Issue list filters can index.
- Search title/name co the can trigram index neu data lon.

Index nen co:

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

## Observability

- Log requestId cho error.
- Log domain action quan trong:
  - create board
  - move card
  - delete column
  - data migration apply
- Khong log password/token raw.

## Security

Can verify:

- Cookies `httpOnly`.
- Production cookie `secure=true`, `sameSite=none` neu cross-domain.
- CORS chi allow domain FE.
- Rate limit auth endpoints.
- ValidationPipe whitelist.
- Khong expose `password`, `verifyToken`, refresh token hash.

## Documentation

Update:

```txt
README.md
docs/database-migration-plan.md
docs/dbdiagram.dbml
.env.example
```

Can ghi:

- Cach chay local voi FE.
- Endpoint status.
- Env can thiet.
- Data migration command.
- Rollback data migration.

## Definition of done

- Unit/e2e tests cover core flow.
- Permission role theo board ro rang.
- Khong con compatibility hack khong duoc document.
- README va env example dung voi cach FE chay.
- Co checklist release/cutover cho moi truong that.
