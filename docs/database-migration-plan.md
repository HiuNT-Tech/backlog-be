# Kế hoạch phân tích migration MongoDB sang PostgreSQL

## 1. Phạm vi và nguyên tắc

Nguồn phân tích là project hiện tại tại `/home/hiunt/Documents/Backlog/BE`. Project này đang dùng ExpressJS với MongoDB native driver, chưa thấy Mongoose schema/decorator kiểu NestJS. Các schema hiện tại được mô tả bằng Joi trong `src/models/*Model.js` và một phần validation request trong `src/validations/*Validation.js`.

Project BE mới là `/home/hiunt/Documents/Backlog/be_02`. Tài liệu này chỉ là thiết kế trước khi code, không sửa runtime, không tạo migration thật, không seed dữ liệu thật.

Nguyên tắc:

- **User/Auth/User Profile đã chuyển sang PostgreSQL.** Bảng `users` nằm trong PostgreSQL với integer autoincrement primary key.
- Dữ liệu nghiệp vụ chính nằm trong PostgreSQL.
- Các bảng PostgreSQL có liên quan user dùng `user_id integer` với FK trực tiếp tới `users(id)`.
- Các `_id` MongoDB của dữ liệu nghiệp vụ nên được map sang UUID mới khi migrate; giữ thêm `legacy_mongo_id` để đối soát trong giai đoạn chuyển đổi.
- Nếu có dữ liệu user MongoDB cũ, dùng `users.legacy_mongo_id` để map khi migrate.

## 2. Tổng quan hiện trạng MongoDB

Các collection được sử dụng trực tiếp qua `GET_DB().collection(...)`:

| Collection | File chính | Vai trò hiện tại |
| --- | --- | --- |
| `users` | `src/models/userModel.js` | User, auth, profile cơ bản, trạng thái verify account |
| `counters` | `src/models/counterModel.js` | Bộ đếm sequence, hiện dùng cho `user_code` |
| `boards` | `src/models/boardModel.js` | Board/project, member nhúng, thứ tự column |
| `columns` | `src/models/columnModel.js` | Column/status trong board, thứ tự card |
| `cards` | `src/models/cardModel.js` | Issue/card nghiệp vụ |
| `issue_types` | `src/models/issueTypeModel.js` | Loại issue theo board |
| `versions` | `src/models/versionModel.js` | Version/release/milestone theo board |

Không tìm thấy `populate()` hay Mongoose `ref`; quan hệ đang được xử lý thủ công bằng `ObjectId`, `$lookup`, array ObjectId và service-level lookup.

## 3. Quan hệ hiện tại giữa collection

| Quan hệ | Cách hiện tại trong MongoDB | Thiết kế PostgreSQL đề xuất |
| --- | --- | --- |
| `boards.members.userId` -> `users._id` | `members` là array object trong `boards`; `$lookup` sang `users` trong `getUsersBoard` | Bảng `board_members` với `user_id integer` FK → `users(id)` |
| `boards.columnOrderIds[]` -> `columns._id` | Array ObjectId trong `boards` | Cột `position` trong `columns`; có thể giữ bảng/order riêng nếu cần audit |
| `columns.boardId` -> `boards._id` | ObjectId | FK `columns.board_id` -> `boards.id` |
| `columns.cardOrderIds[]` -> `cards._id` | Array ObjectId trong `columns` | Cột `position` trong `cards` theo từng column |
| `cards.boardId` -> `boards._id` | ObjectId | FK `cards.board_id` -> `boards.id` |
| `cards.columnId` -> `columns._id` | ObjectId | FK `cards.column_id` -> `columns.id` |
| `cards.assigneeId` -> `users._id` | ObjectId, service lookup qua `userModel.getManyByIds` | `cards.assignee_user_id integer` FK → `users(id)` |
| `cards.issueTypeId` -> `issue_types._id` | ObjectId + `$lookup` | FK `cards.issue_type_id` -> `issue_types.id` |
| `cards.versionId` -> `versions._id` | ObjectId | FK `cards.version_id` -> `versions.id` |
| Lịch sử move/update card | Chưa có collection riêng trong source hiện tại | Thêm `card_activity_logs`; `cards` chỉ giữ `column_id` và `position` hiện tại |
| `issue_types.boardId` -> `boards._id` | ObjectId | FK `issue_types.board_id` -> `boards.id` |
| `issue_types` -> `cards` | `$lookup` để đếm issueCount | Query count từ `cards` theo `issue_type_id` |
| `versions.boardId` -> `boards._id` | ObjectId | FK `versions.board_id` -> `boards.id` |

Điểm đã xác nhận / cần lưu ý:

- `cards.registeredBy` có dùng trong dữ liệu thật, nên map sang `cards.registered_by_user_id integer` FK → `users(id)`.
- `boards.members.role` trong dữ liệu thật lưu dạng số. Khi migrate map `1 -> admin`, `2 -> pm`, `3 -> member`, `4 -> guest`.
- BE mới dùng soft delete cho dữ liệu nghiệp vụ. PostgreSQL dùng `deleted_at`; không hard delete mặc định.
- `issue_types.name` cần unique theo board.
- `boards.slug` cần unique.
- `versions.startDate/endDate` dùng PostgreSQL type `date`, API dùng ISO 8601 date-only `YYYY-MM-DD`.
- Khi migrate cần kiểm tra format dữ liệu cũ trước khi parse.
- Cần audit lịch sử move card/column. Thêm bảng `card_activity_logs`; bảng `cards` vẫn chỉ lưu `column_id` và `position` hiện tại.
- `verifyToken` chỉ là dữ liệu nội bộ để verify email, không được export trong response DTO hoặc legacy FE response.

## 4. Tất cả collection chuyển PostgreSQL

| Collection | Chuyển PostgreSQL | Lý do |
| --- | --- | --- |
| `users` | ĐÃ CHUYỂN | Source of truth cho user. Integer autoincrement PK. FK trực tiếp từ boards, cards, activity_logs. Không cần hybrid lookup MongoDB nữa. |
| `boards` | Có | Là aggregate root nghiệp vụ. Có quan hệ rõ với columns, cards, issue types, versions, members. PostgreSQL giúp enforce uniqueness, query board/member tốt hơn. |
| `columns` | Có | Phụ thuộc board, có thứ tự và trạng thái. Phù hợp table quan hệ với FK `board_id`. |
| `cards` | Có | Dữ liệu nghiệp vụ chính, nhiều filter theo board/status/assignee/priority/issue type/version/date. PostgreSQL phù hợp index và join. |
| `issue_types` | Có | Reference data theo board, đang join/count với cards. Phù hợp FK và unique constraint theo board. |
| `versions` | Có | Reference/release data theo board, liên kết cards. Phù hợp FK và date query. |

Collection giữ MongoDB (tạm thời):

| Collection | Giữ MongoDB | Lý do |
| --- | --- | --- |
| `counters` | Có, nếu vẫn phục vụ legacy logic | BE mới không còn copy `verifyToken` sang `userCode`. Counter có thể bỏ nếu không cần sequence number hoặc mã user legacy. |

## 5. Mapping MongoDB collection -> PostgreSQL table

| MongoDB | PostgreSQL | Ghi chú mapping |
| --- | --- | --- |
| `users` | `users` | `_id` -> `legacy_mongo_id`; `id` integer tự tăng; dùng FK trực tiếp cho tất cả bảng nghiệp vụ; `verify_token` chỉ dùng nội bộ cho email verification, không trả ra API response. |
| `boards` | `boards` | `_id` -> `id uuid`; giữ `legacy_mongo_id`; `members` tách sang `board_members`; `columnOrderIds` thay bằng `columns.position`. |
| `boards.members[]` | `board_members` | `userId` -> `user_id integer` FK → `users(id)`; `role` -> enum `board_member_role`. |
| `columns` | `columns` | `boardId` -> `board_id`; `cardOrderIds` thay bằng `cards.position`; `statusColor` -> `status_color_id`. |
| `cards` | `cards` | `boardId`, `columnId`, `issueTypeId`, `versionId` thành FK; `assigneeId` -> `assignee_user_id integer` FK; `registeredBy` -> `registered_by_user_id integer` FK. |
| Không có collection cũ | `card_activity_logs` | Bảng mới để audit lịch sử di chuyển card, đổi column, đổi position và các hành động quan trọng khác. |
| `issue_types` | `issue_types` | `boardId` -> `board_id`; `statusColor` -> `status_color_id`. |
| `versions` | `versions` | `boardId` -> `board_id`; `startDate`, `endDate` nên dùng `date`. |
| constants `PRIORITY` | `priorities` hoặc enum | Đề xuất master table để dễ hiển thị tên/level. |
| constants `StatusColor` | `status_colors` | Master table thay vì số magic 1..10. |
| constants `BOARD_TYPES` | enum `board_type` | `public`, `private`. |
| constants `ROLE` | enum `board_member_role` | Dữ liệu MongoDB đang lưu số: `1 -> admin`, `2 -> pm`, `3 -> member`, `4 -> guest`. |

## 6. Đề xuất master/reference data

Nên có master data trong PostgreSQL:

| Table | Dữ liệu đề xuất | Lý do |
| --- | --- | --- |
| `status_colors` | 1 red, 2 orange, 3 pink, 4 indigo, 5 blue, 6 teal, 7 green, 8 yellow, 9 bright_red, 10 black | Hiện `columns.statusColor` và `issue_types.statusColor` dùng số. Tách master để UI lấy label/token ổn định. |
| `priorities` | 1 low, 2 normal, 3 high | Hiện `cards.priorityId` dùng constants số. Tách master để filter/sort/label rõ ràng. |

Có thể dùng enum thay master table cho priority/status color nếu domain rất cố định. Tuy nhiên vì UI thường cần label/color token, master table linh hoạt hơn.

## 7. Quy tắc lưu user_id trong PostgreSQL

- Tất cả user reference trong PostgreSQL dùng `user_id integer` với FK → `users(id)`.
- **Bảng `users` nằm trong PostgreSQL** với integer autoincrement primary key.
- Có foreign key bảo vệ tính toàn vẹn dữ liệu.
- Các field user hiện tại:
  - `boards.members.userId` -> `board_members.user_id` FK.
  - `cards.assigneeId` -> `cards.assignee_user_id` FK.
  - `cards.registeredBy` -> `cards.registered_by_user_id` FK.
  - `card_activity_logs.actor` -> `card_activity_logs.actor_user_id` FK.
- JOIN trực tiếp giữa user và nghiệp vụ, không cần lookup service layer.
- Nếu migrate dữ liệu cũ từ MongoDB, dùng `users.legacy_mongo_id` để map.

## 8. Thiết kế PostgreSQL đề xuất

Bảng trong PostgreSQL:

- `users` ← MỚI (chuyển từ MongoDB)
- `boards`
- `board_members`
- `columns`
- `cards`
- `issue_types`
- `versions`
- `priorities`
- `status_colors`
- `card_activity_logs`

Khuyến nghị chung:

- `id uuid primary key`.
- `legacy_mongo_id varchar(24) unique` trong các bảng migrate từ collection để đối soát.
- `created_at timestamptz not null`, `updated_at timestamptz not null`.
- `deleted_at timestamptz null` cho bảng cần soft delete: `users`, `boards`, `columns`, `cards`, `issue_types`, `versions`, `board_members`.
- API nhận/lưu ngày nghiệp vụ dạng ISO 8601 date-only `YYYY-MM-DD` cho `versions.start_date`, `versions.end_date`, `cards.start_date`, `cards.due_date` nếu không cần giờ. PostgreSQL dùng kiểu `date` cho các field này. Khi migrate phải kiểm tra format dữ liệu cũ trước khi parse.
- `cards` chỉ lưu trạng thái hiện tại gồm `column_id` và `position`. Lịch sử di chuyển card/đổi column/đổi position và các hành động quan trọng khác lưu trong `card_activity_logs`.
- Index các truy vấn hiện có:
  - Board theo member: `board_members(user_id, board_id)`.
  - Card theo board/filter: `cards(board_id, deleted_at)`, `cards(column_id, position)`, `cards(assignee_user_id)`, `cards(issue_type_id)`, `cards(version_id)`, `cards(priority_id)`.
  - Search title/name có thể dùng trigram index sau nếu cần.

## 9. Risk khi dùng hybrid MongoDB + PostgreSQL (đã giảm đáng kể)

- **User đã chuyển PostgreSQL**: Rủi ro chính về N+1 query, thiếu FK, không join được user đã được loại bỏ.
- MongoDB chỉ còn giữ `counters` (nếu cần) — có thể loại bỏ hoàn toàn sau khi xác nhận không cần sequence cũ.
- Migration cần map `_id ObjectId` sang UUID nhất quán; nếu mất mapping sẽ khó khôi phục quan hệ.
- Soft delete/hard delete hiện không nhất quán trong BE cũ; BE mới đã chốt dùng `deleted_at` để chuẩn hóa hành vi nghiệp vụ.
- Date/time hiện đang trộn timestamp number và string date. PostgreSQL cần chuẩn hóa kiểu `timestamptz`/`date`.

## 10. Các bước nên làm tiếp theo

1. Rà dữ liệu thật để xác nhận format ngày cũ và kiểm tra record lệch schema.
2. Chốt strategy ID: UUID mới + `legacy_mongo_id`, hoặc giữ ObjectId string làm id. Tài liệu DBML hiện đề xuất UUID mới.
3. Áp dụng `deleted_at` thống nhất cho nghiệp vụ.
4. Chốt enum/master data: role, board type, priority, status color.
5. Thiết kế DTO/service NestJS mới theo module: boards, columns, cards, issue-types, versions.
6. Viết migration script dry-run riêng để đọc MongoDB, tạo mapping, validate count/relationship, nhưng chưa chạy thật.
7. Tạo test data snapshot nhỏ để kiểm tra mapping board -> columns -> cards -> issue types -> versions -> card activity logs.
8. Sau khi review DBML, mới tạo Prisma schema/migration thật trong `be_02`.

## 11. Verification path khi bắt đầu code

- So sánh số lượng record MongoDB theo collection với số row PostgreSQL sau migrate dry-run.
- Kiểm tra mỗi board migrate có đủ columns, cards, issue_types, versions.
- Kiểm tra `board_members.user_id`, `cards.assignee_user_id`, `cards.registered_by_user_id` có FK hợp lệ tới `users(id)`.
- Kiểm tra API board detail trả được columns/cards đúng thứ tự `position`.
- Kiểm tra filter card theo priority, issue type, column, assignee, version giữ hành vi như cũ.
- Kiểm tra khi move card hoặc đổi column/position thì `cards.column_id`, `cards.position` được cập nhật và `card_activity_logs` ghi lại before/after đúng.

## 12. Những điểm đã chốt

- ĐÃ CHỐT chuyển `users` sang PostgreSQL với integer autoincrement PK. Bỏ thiết kế hybrid cho user.
- ĐÃ CHỐT tất cả user reference dùng `user_id integer` FK → `users(id)`.
- ĐÃ CHỐT `cards.registeredBy` có tồn tại, map sang `cards.registered_by_user_id integer` FK.
- ĐÃ CHỐT `boards.members.role` lưu dạng số, migrate theo mapping `1 admin`, `2 pm`, `3 member`, `4 guest`.
- ĐÃ CHỐT dùng soft delete bằng `deleted_at` cho dữ liệu nghiệp vụ và user.
- ĐÃ CHỐT `issue_types.name` unique theo board và `boards.slug` unique.
- ĐÃ CHỐT `versions.startDate/endDate` dùng PostgreSQL type `date`, API dùng ISO 8601 date-only `YYYY-MM-DD`.
- ĐÃ CHỐT khi migrate cần kiểm tra format dữ liệu cũ trước khi parse.
- ĐÃ CHỐT cần audit lịch sử move card/column bằng bảng `card_activity_logs`.
- ĐÃ CHỐT `cards` chỉ lưu `column_id` và `position` hiện tại.
