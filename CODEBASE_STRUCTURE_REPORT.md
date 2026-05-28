# Bao cao cau truc codebase backend ACMS Evaluation

## 1. Tong quan

Codebase nay la mot backend API Laravel dung lam he thong danh gia nhan su/performance evaluation trong bo ACMS.

Stack chinh:

- PHP `^8.2`
- Laravel Framework `^12.0`
- MySQL la database chinh
- MongoDB connection duoc cau hinh san qua `mongodb/laravel-mongodb`
- Queue driver mac dinh: `database`
- JWT decode bang `firebase/php-jwt`
- Import/export Excel bang `maatwebsite/excel`
- Docker gom Nginx, PHP, tuy chon MySQL va Mailhog
- Frontend asset rat mong, chi co Vite/Tailwind skeleton cua Laravel

Huong kien truc chinh:

```text
HTTP Request
  -> routes/api.php
  -> Middleware
  -> FormRequest validation
  -> Controller
  -> Business service
  -> Repository facade
  -> Repository implementation
  -> Eloquent Model / Query Builder
  -> Resource
  -> ResponseFactory
  -> JSON response
```

Day la codebase backend thien ve API, tach ro cac lop:

- `Controller`: nhan request, goi service, mo/commit transaction, tra response.
- `Request`: validate input.
- `Business`: chua logic nghiep vu.
- `Repository`: truy van du lieu.
- `Model`: mapping table, fillable, casts, relation.
- `Resource`: dinh dang output.
- `Constant`: tap trung enum/status/message code.
- `Provider`: bind interface vao implementation va mo rong he thong.

## 2. Cau truc thu muc cap cao

```text
app/
  Business/        Logic nghiep vu va tich hop ACMS ngoai
  Console/         Artisan commands
  Constants/       Hang so domain, status, type, response code
  Exceptions/      Custom exception handler
  Exports/         Excel export
  Helpers/         Helper tinh nang nho
  Http/
    Controllers/   API controllers
    Middleware/    Auth, permission, model exists, request logging
    Requests/      FormRequest validation
    Resources/     API response transformers
  Imports/         Excel import
  Jobs/            Queue jobs
  Mail/            Mailable classes
  Models/          Eloquent models
  Providers/       Service providers
  Repositories/    Repository pattern
  Services/        Shared services: API response, JWT, file
  Traits/          Shared trait: HTTP client, mask log, mail, uuid
bootstrap/         Laravel bootstrap va provider registration
config/            Config Laravel va custom config
database/
  migrations/      Schema history
  seeders/         Master data seeders
docker/            Dockerfile va config Nginx/PHP/MySQL/Mailhog
resources/         Blade mails, export views, lang messages, Vite assets
routes/            api.php, web.php, console.php
scripts/           Script start/stop/run/build va git hooks
storage/           Logs, cache, uploaded local files
tests/             PHPUnit skeleton
```

## 3. Dependency va runtime

File chinh: `composer.json`.

Production dependencies:

- `laravel/framework`: core framework.
- `firebase/php-jwt`: decode access token tu ACMS.
- `mongodb/laravel-mongodb`: ho tro MongoDB connection.
- `maatwebsite/excel`: import/export Excel.
- `laravel/tinker`: interactive shell.

Dev dependencies:

- `phpunit/phpunit`: test.
- `laravel/pint`: format code.
- `squizlabs/php_codesniffer`: code style.
- `laravel/pail`: log tailing.
- `laravel/sail`: local dev optional.

Scripts dang chu y:

```json
"test": [
  "@php artisan config:clear --ansi",
  "@php artisan test"
],
"dev": [
  "php artisan serve",
  "php artisan queue:listen --tries=1",
  "php artisan pail --timeout=0",
  "npm run dev"
]
```

Package frontend trong `package.json` chi phuc vu Vite/Tailwind skeleton, khong phai mot SPA day du.

## 4. Bootstrap va provider

### 4.1 `bootstrap/app.php`

Laravel 12 bootstrap khai bao:

- API routes: `routes/api.php`
- Web routes: `routes/web.php`
- Console routes: `routes/console.php`
- Health endpoint: `/up`

Middleware group `api` gom:

- `RequestLogger`
- `CheckAvailableUser`

Middleware alias:

- `model.exists` -> `CheckAvailableModel`
- `permission` -> `CheckPermission`
- `check_active_performance_review` -> `CheckActivePerformanceReview`

He qua quan trong: moi route API mac dinh deu yeu cau Bearer token hop le vi `CheckAvailableUser` nam trong group `api`.

### 4.2 `bootstrap/providers.php`

Provider dang ky:

- `AppServiceProvider`
- `ApiServiceProvider`
- `AdditionServiceProvider`
- `RepositoryServiceProvider`
- `QueryBuilderTimestampProvider`
- `DatabaseQueryServiceProvider`

### 4.3 Provider pattern

`RepositoryServiceProvider` bind tat ca repository interface vao implementation bang singleton.

Vi du:

```php
$this->app->singleton(
    CompetencyRepositoryInterface::class,
    CompetencyRepository::class
);
```

`ApiServiceProvider` bind:

- `ResponseFactoryInterface` -> `ResponseFactory`

`AdditionServiceProvider` bind:

- `JWTServiceInterface` -> `JWTService`
- `FileServiceInterface` -> `FileService`

`QueryBuilderTimestampProvider` them macro:

- `insertTimestamp`
- `updateTimestamp`

`DatabaseQueryServiceProvider` bat SQL logging neu `ENABLE_SQL_LOG=true`.

## 5. Routing API

File chinh: `routes/api.php`.

Nhom API lon:

- `GET upload-file`
- `GET positions`
- `GET levels`
- `GET users`
- `GET divisions`
- `performance-reviews`
- `review-assignments`
- `competency-frameworks`
- `competency-positions`
- `competencies`
- `questions`
- `competency-levels`
- `performance-evaluations`
- `tests`
- `test-evaluations`
- `me`

### 5.1 Pattern route CRUD

Module CRUD di theo pattern:

```text
GET    /resource              list
POST   /resource              create
GET    /resource/{id}         detail
PUT    /resource/{id}         update
DELETE /resource/{id}         delete
```

Route detail/update/delete thuong gan:

```php
->middleware('model.exists:' . ModelClass::class)
```

De tao module moi, nen lap lai pattern nay:

1. Tao controller.
2. Tao request list/create/update.
3. Tao resource.
4. Tao model.
5. Tao repository interface + implementation.
6. Tao business service.
7. Bind repository trong `RepositoryServiceProvider`.
8. Them getter trong `Repository` facade va `Business` facade.
9. Them route trong `routes/api.php`.

### 5.2 Route nghiep vu performance review

`performance-reviews` la module trung tam, gom:

- List/create/detail/update/delete ky danh gia.
- Update status.
- Danh sach user trong ky danh gia.
- Gan/cap nhat reviewers.
- Lay ket qua test/performance/360/interview/summary.
- Import ket qua test.
- Gui mail notify.
- Export reviewers.

`me` la nhom endpoint cho user hien tai:

- Current performance review.
- Performance review histories.
- My evaluation info.
- My performance results.
- My 360 results.
- My interview results.
- My summary results.

## 6. Chuan response API

Lop chinh: `app/Services/Api/ResponseFactory.php`.

Success response:

```json
{
  "code": "OK",
  "message": "...",
  "status": 200,
  "data": {}
}
```

Error response:

```json
{
  "code": "FAILURE",
  "message": "...",
  "status": 422,
  "errors": {}
}
```

Controller khong goi `response()` truc tiep cua Laravel ma goi:

```php
$this->response()->success(...)
$this->response()->error(...)
```

`Controller` base lay response factory qua:

```php
Service::response()
```

## 7. Validation request

Base class: `app/Http/Requests/BaseFormRequest.php`.

Dac diem:

- `authorize()` mac dinh return `true`.
- Khi validation fail, nem `HttpResponseException`.
- Response loi validation dung format chung cua `ResponseFactory`.
- `errors` la danh sach rule fail, khong phai message text cua Laravel.

Request module dung constant de validate enum.

Vi du `CompetencyRequest`:

- `competency_framework_id`: required, in constant.
- `code`: required, max 20, unique with `deleted_at IS NULL`.
- `behaviors`: required array min 1.
- `behaviors.*.level`: in constant.

Khi dung codebase nay lam chuan, nen tao request rieng cho:

- `ListRequest`: page/per_page/filter/sort.
- `CreateRequest` hoac shared `ResourceRequest`.
- `UpdateRequest` neu rules khac create.
- Request cho action dac biet nhu import/export/status.

## 8. Resource va pagination

Base resource:

- `BaseJsonResource`
- `BaseCollectionResource`

Tat ca resource nen extend `BaseJsonResource`.

Pagination response duoc chuan hoa:

```json
{
  "items": [],
  "total": 100,
  "count": 20,
  "per_page": 20,
  "current_page": 1,
  "total_pages": 5
}
```

Resource chi expose field can thiet va dung `whenLoaded` cho relation.

Vi du `CompetencyResource` expose:

- `id`
- `framework`
- `behaviors`
- `level_details`
- `interview_questions`
- `code`
- `name`
- `question_quantity`
- `description`
- `created_at`
- `positions` neu co data gan them vao model

## 9. Repository pattern

### 9.1 Lop nen

File:

- `app/Repositories/Base/BaseRepositoryInterface.php`
- `app/Repositories/Base/BaseRepository.php`

Method chung:

- `getList`
- `getListPagination`
- `getDetail`
- `exists`
- `count`
- `create`
- `insert`
- `insertTimestamp`
- `update`
- `updateById`
- `updateWithModel`
- `updateOrCreate`
- `upsert`
- `updateOrCreateAndGetIds`
- `delete`
- `getLatestRecord`

`BaseRepository` co 2 kieu builder:

- `CommonConstant::BUILDER_TYPE_ELOQUENT`
- `CommonConstant::BUILDER_TYPE_QUERY`

Filter trong `whereClause` chi ap dung neu key nam trong `$model->getFillable()`.

Dieu nay rat quan trong khi viet filter:

- Neu field filter khong nam trong `$fillable`, base repository se bo qua.
- Cac filter phuc tap nhu keyword, date range, join, whereHas nen viet trong repository rieng cua module.

### 9.2 Repository facade

File: `app/Repositories/Repository.php`.

Day la static facade noi bo:

```php
Repository::getCompetency()
Repository::getPerformanceReview()
Repository::getUser()
```

No lay implementation thong qua container va interface da bind.

### 9.3 Repository module

Moi module co cap:

```text
app/Repositories/Foo/FooRepositoryInterface.php
app/Repositories/Foo/FooRepository.php
```

Implementation thuong extend `BaseRepository`.

Neu can query rieng, viet method rieng trong repository module.

Vi du `CompetencyRepository::getCompetencyListPagination()`:

- eager load relations
- filter theo `position_id` bang `whereHas`
- search `keyword` theo name/description
- paginate theo `page/per_page`

## 10. Business service pattern

File facade: `app/Business/Business.php`.

Business service chia 2 nhom:

```text
app/Business/ACMS/
  BOService.php
  MEService.php
  UserService.php

app/Business/Evaluation/
  CompetencyService.php
  PerformanceReviewService.php
  PerformanceReviewUserService.php
  ...
```

`Business` facade expose static getter:

```php
Business::getCompetency()
Business::getPerformanceReview()
Business::getMEService()
```

Business service chua logic:

- Xu ly transaction-level operation.
- Goi nhieu repository.
- Goi service ngoai ACMS.
- Build relation tam tren model.
- Validate business rule, throw `HttpResponseException` neu loi nghiep vu.
- Xu ly import/export/mail/score calculation.

Quy uoc nen giu:

- Controller khong query truc tiep repository tru khi thuc su don gian.
- Business service khong tra raw response HTTP, tru truong hop nem exception theo response factory.
- Repository khong chua business rule.

## 11. Model layer

Thu muc: `app/Models`.

Model dung Eloquent, nhieu model co:

- `SoftDeletes`
- `$table`
- `$fillable`
- `$casts`
- `$hidden`
- relationship co `select` field ro rang

Nhom model chinh:

- User/role/permission:
  - `User`
  - `Role`
  - `Permission`
  - `RoleUser`
  - `RolePermission`
- Competency dictionary:
  - `CompetencyFramework`
  - `Competency`
  - `CompetencyBehavior`
  - `CompetencyBehaviorDetail`
  - `CompetencyLevel`
  - `CompetencyLevelDetail`
  - `CompetencyPosition`
  - `CompetencyInterviewQuestion`
- Performance review:
  - `PerformanceReview`
  - `PerformanceReviewTimeline`
  - `PerformanceReviewCompetency`
  - `PerformanceReviewUser`
  - `PerformanceReviewUserResult`
- Evaluation:
  - `PerformanceEvaluation`
  - `PerformanceEvaluationRole`
  - `ReviewAssignment`
  - `User360Result`
  - `UserInterviewResult`
  - `UserPerformanceResult`
- Test:
  - `Test`
  - `TestQuestion`
  - `TestEvaluation`
  - `UserTest`
  - `UserTestAnswer`
- Question/answer:
  - `Question`
  - `Answer`
  - `ScoreLevel`

Vi du `PerformanceReview` co relation:

- `performanceReviewTimelines`
- `performanceReviewTimelineTest`
- `performanceReviewTimelinePerformance`
- `performanceReviewTimeline360`
- `performanceReviewTimelineInterview`
- `performanceReviewUsers`
- `performanceReviewAuth`
- `performanceReviewCompetencies`

## 12. Middleware va auth

### 12.1 `CheckAvailableUser`

Chay tren moi API request.

Xu ly:

1. Lay Bearer token.
2. Neu khong co token -> error `CODE_ACCESS_TOKEN_IS_REQUIRED`.
3. Decode JWT bang `JWTService`.
4. Neu decode fail/null -> error invalid token.
5. Check user ton tai trong database theo `user_id`.
6. Check `exp < time()`.
7. Cho request di tiep.

JWT secret/algo lay tu:

```text
JWT_SECRET
JWT_ALGO
```

### 12.2 `CheckPermission`

Dung middleware:

```php
->middleware('permission:permission.code')
```

Logic:

- Decode token lay `user_id`.
- Check role permission qua `RolePermissionRepository`.
- Neu khong co -> HTTP 403.

Trong `routes/api.php`, nhieu middleware permission dang bi comment. Khi dung lam chuan cho he thong moi, can quyet dinh bat lai theo role matrix.

### 12.3 `CheckAvailableModel`

Dung de check `{id}` ton tai truoc khi vao controller.

Pattern:

```php
->middleware('model.exists:' . ModelClass::class)
```

Middleware map model class sang business service trong `getModelService`.

Khi them model moi, can them case vao middleware neu muon dung `model.exists`.

### 12.4 `CheckActivePerformanceReview`

Middleware rieng de chan thao tac submit score/import khi performance review khong active hoac khong dung timeline. Nen doc chi tiet truoc khi mo rong cac action danh gia moi.

### 12.5 `RequestLogger`

Log request/response vao channel `api`.

Co mask key nhay cam qua `MaskedTrait`, hien tai `CommonConstant::MASKED_KEY` gom:

- `access_token`

## 13. Exception handling va logging

File: `app/Exceptions/Handler.php`.

`report()` custom:

- Tim file/line dau tien nam ngoai `vendor`.
- Log vao channel `error`.

`render()` map exception:

- `UnauthorizedHttpException` -> 401
- `ExpiredException` -> 401
- `ForbiddenException` -> 403
- `NotFoundHttpException` / `ModelNotFoundException` -> 404
- `MethodNotAllowedHttpException` -> 405
- default -> 500

Neu `ENABLE_ERROR_DETAIL_RESPONSE=true`, response loi co them message/file/line.

Log channel custom trong `config/logging.php`:

- `api` -> `storage/logs/api.log`
- `error` -> `storage/logs/error.log`
- `sql` -> `storage/logs/sql.log`

SQL log bat/tat bang:

```text
ENABLE_SQL_LOG=true|false
```

## 14. Constants

Thu muc: `app/Constants`.

Quy uoc:

- Moi domain/module co file constant rieng.
- Common config/status dung `CommonConstant`.
- Response code dung `ResponseConstant`.
- Type/status/evaluation role dung constant de request validation, business rule va resource cung tham chieu.

Vi du common:

- `BUILDER_TYPE_ELOQUENT`
- `BUILDER_TYPE_QUERY`
- `DEFAULT_PER_PAGE`
- `DEFAULT_PAGE`
- `STATUS_ACTIVE`
- `STATUS_INACTIVE`
- `RESPONSE_CODE_FAILURE`
- `LOG_CHANNEL_API`
- `LOG_CHANNEL_ERROR`
- `LOG_CHANNEL_SQL`

Khi dung codebase nay lam chuan, khong nen hard-code status/type trong controller/service. Nen tao constant truoc.

## 15. Tich hop he thong ngoai

### 15.1 ACMS ME

File: `app/Business/ACMS/MEService.php`.

Config:

```php
config('services.acms.me.domain')
config('services.acms.me.position.list')
config('services.acms.me.level.list')
```

Chuc nang:

- Lay danh sach positions.
- Lay danh sach levels.
- Lay positions group by id de merge vao competency/performance review.

### 15.2 ACMS BO

File: `app/Business/ACMS/BOService.php`.

Config:

```php
config('services.acms.bo.domain')
config('services.acms.bo.division.list')
```

Chuc nang:

- Lay danh sach divisions tu HR/BO service.

### 15.3 HTTP client trait

File: `app/Traits/HttpClient.php`.

Co cac method:

- `httpGet`
- `httpPost`
- `httpPut`
- `httpDelete`

Dac diem:

- Dung Laravel `Http`.
- `verify => false`.
- Co the gan Bearer token neu truyen `$accessToken`.
- Return `json_decode($responseBody)`.

Neu nhan ban sang he thong moi, nen can nhac:

- Them timeout.
- Them retry.
- Log outbound request.
- Khong tat SSL verify o production neu khong bat buoc.

## 16. File upload, import, export, mail, queue

### 16.1 File service

File: `app/Services/File/FileService.php`.

Chuc nang:

- Lay ten file/extension.
- Store file vao disk cau hinh.
- Copy/move/delete file.
- Move file tu temp sang folder dich.
- Replace URL file trong content sau khi move.

Folder temp dung constant trong `FileConstant`.

### 16.2 Import Excel

Thu muc: `app/Imports`.

Files:

- `BaseImport`
- `CompetencyImport`
- `FormInterviewImport`
- `Import360`
- `ImportPerformanceNonProduction`
- `ImportPerformanceProduct`
- `ImportScoreLevel`
- `ImportTestResults`

Pattern:

- Controller `ImportController` nhan file/request.
- Import class parse Excel.
- Business service/repository upsert data.

### 16.3 Export Excel

Thu muc:

- `app/Exports/PerformanceReviewExport.php`
- `resources/views/exports/performance_review_members.blade.php`

Controller export:

```php
Excel::download(new PerformanceReviewExport(...), $fileName . '.xlsx')
```

### 16.4 Mail

Files:

- `app/Mail/NotifyMail.php`
- `app/Jobs/SendMailNotifyJob.php`
- `resources/views/mails/notify.blade.php`
- `resources/views/mails/mail-leader-reminder.blade.php`
- `resources/views/mails/mail-member-reminder.blade.php`

Queue connection trong `.env.example`:

```text
QUEUE_CONNECTION=database
```

Migration tao jobs table:

```text
2025_09_19_040944_create_jobs_table.php
```

### 16.5 Console commands

Thu muc: `app/Console/Commands`.

Commands:

- `PerformanceReviewMemberReminder`
- `PerformanceReviewLeaderReminder`
- `TestSmtpConnection`

Luu y: `routes/console.php` hien chua schedule cac command nay. Neu muon auto reminder, can them schedule vao Laravel scheduler hoac cron.

## 17. Database va migration

Thu muc migration co lich su schema lon, tap trung vao cac bang:

- `competencies`
- `competency_levels`
- `competency_behaviors`
- `competency_frameworks`
- `competency_positions`
- `competency_behavior_details`
- `competency_level_details`
- `competency_interview_questions`
- `performance_reviews`
- `performance_review_users`
- `performance_review_competencies`
- `performance_review_timelines`
- `performance_review_user_results`
- `performance_evaluations`
- `performance_evaluation_roles`
- `review_assignments`
- `questions`
- `answers`
- `tests`
- `test_questions`
- `test_evaluations`
- `user_tests`
- `user_test_answers`
- `user_360_results`
- `user_interview_results`
- `user_performance_results`
- `roles`
- `permissions`
- `role_users`
- `role_permissions`
- `score_levels`
- `jobs`

Seeders:

- `CompetencyFrameworkSeeder`
- `CompetencyPositionSeeder`
- `CompetencySeeder`
- `PermissionSeeder`
- `RolePermissionSeeder`
- `RoleSeeder`
- `RoleUserSeeder`
- `ScoreLevelSeeder`

`DatabaseSeeder` la diem tap trung goi seeders.

Khi lap he thong moi tu codebase nay:

1. Tao migration theo module.
2. Tao model voi `$fillable` day du.
3. Tao seeder cho master data/status/role/permission.
4. Them relation ro rang va select field can thiet.
5. Dam bao soft delete neu repository/base query can check `deleted_at`.

## 18. Docker va local setup

README huong dan:

```sh
cp .env.example .env
./scripts/start.sh
./scripts/run.sh composer install
./scripts/run.sh php artisan key:generate
./scripts/run.sh php artisan migrate
```

`docker-compose.yml` co:

- `nginx`: expose `${NGINX_PORT}:80`, mount source code.
- `php`: build tu `docker/php/Dockerfile`.
- `mysql`: dang comment, co the uncomment khi can local DB.
- `mailhog`: dang comment, co the uncomment khi can test mail.

`.env.example` default:

```text
APP_NAME=ACMS
DB_CONNECTION=mysql
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local
NGINX_PORT=8016
JWT_SECRET=...
ACMS_ME_DOMAIN=...
ACMS_BO_DOMAIN=...
```

Scripts:

- `scripts/start.sh`
- `scripts/stop.sh`
- `scripts/run.sh`
- `scripts/build.sh`
- `scripts/git/hooks.sh`

## 19. Module nghiep vu chinh

### 19.1 Competency management

Thanh phan:

- Controller: `CompetencyController`
- Request: `CompetencyRequest`, `CompetencyListRequest`
- Resource: `CompetencyResource`
- Service: `CompetencyService`
- Repository: `CompetencyRepository`
- Model: `Competency`

Chuc nang:

- List voi filter keyword/position.
- Detail kem framework, behaviors, level details, interview questions.
- Create competency kem behaviors.
- Update competency va thay the behaviors neu request co behaviors.
- Delete competency kem behaviors/interview questions/positions/level details.
- Chan delete neu competency dang thuoc performance review active.

### 19.2 Performance review

Thanh phan:

- Controller: `PerformanceReviewController`
- Service: `PerformanceReviewService`
- Repository: `PerformanceReviewRepository`
- Model: `PerformanceReview`
- Resource: `PerformanceReviewResource`, `PerformanceReviewCurrentResource`

Chuc nang:

- Quan ly ky danh gia.
- Gan competencies/users/timelines.
- Check current active performance review.
- Check co duoc update competency hay khong dua tren cac moc user da danh gia.
- Send mail notify.
- Export reviewers.
- Lay summary result.

### 19.3 Performance review user

Thanh phan:

- `PerformanceReviewUserController`
- `PerformanceReviewUserService`
- `PerformanceReviewUserRepository`
- `PerformanceReviewUser`
- Nhieu resource trong `PerformanceReviewUser/`

Chuc nang:

- List user trong ky danh gia.
- Lay detail user.
- Gan reviewers.
- Lay lich su danh gia cua user.
- Lay info danh gia cua user hien tai.
- Tinh summary result.

### 19.4 Evaluation results

Nhom service/model:

- `PerformanceReviewUserResultService`
- `User360ResultService`
- `UserInterviewResultService`
- `UserPerformanceResultService`
- `UserTestService`
- `UserTestAnswerService`

Chuc nang:

- Luu score performance.
- Luu score 360.
- Luu score interview.
- Lay test result.
- Tong hop result theo user/performance review/competency.

### 19.5 Permission/RBAC

Model:

- `Role`
- `Permission`
- `RoleUser`
- `RolePermission`

Middleware:

- `CheckPermission`

Seeder:

- `RoleSeeder`
- `PermissionSeeder`
- `RoleUserSeeder`
- `RolePermissionSeeder`

Route permission hien dang comment o mot so endpoint. Neu dung cho production, can xay role matrix ro va bat middleware lai.

## 20. Quy uoc tao module moi theo codebase nay

Gia su can tao module `Project`.

### 20.1 Migration

Tao migration:

```text
database/migrations/yyyy_mm_dd_hhmmss_create_projects_table.php
```

Nen co:

- `id`
- cac field domain
- `created_at`
- `updated_at`
- `deleted_at` neu dung soft delete

### 20.2 Model

Tao:

```text
app/Models/Project.php
```

Bat buoc khai bao:

- `$table`
- `$fillable`
- `$casts`
- `$hidden`
- relations

Nho dua tat ca field filter can dung vao `$fillable`, vi `BaseRepository` chi auto where cac field fillable.

### 20.3 Constant

Tao:

```text
app/Constants/ProjectConstant.php
```

Dat status/type/enum vao day.

### 20.4 Repository

Tao:

```text
app/Repositories/Project/ProjectRepositoryInterface.php
app/Repositories/Project/ProjectRepository.php
```

`ProjectRepository` extend `BaseRepository`.

Them bind vao:

```text
app/Providers/RepositoryServiceProvider.php
```

Them static getter vao:

```text
app/Repositories/Repository.php
```

### 20.5 Business service

Tao:

```text
app/Business/YourDomain/ProjectService.php
```

Hoac neu cung domain evaluation:

```text
app/Business/Evaluation/ProjectService.php
```

Them static getter vao:

```text
app/Business/Business.php
```

### 20.6 Request

Tao:

```text
app/Http/Requests/ProjectListRequest.php
app/Http/Requests/ProjectRequest.php
```

Extend `BaseFormRequest`.

### 20.7 Resource

Tao:

```text
app/Http/Resources/Project/ProjectResource.php
```

Extend `BaseJsonResource`.

### 20.8 Controller

Tao:

```text
app/Http/Controllers/ProjectController.php
```

Pattern:

- `list(ProjectListRequest $request)`
- `getDetail(int $id)`
- `create(ProjectRequest $request)`
- `update(int $id, ProjectRequest $request)`
- `delete(int $id)`

Voi create/update/delete nen dung transaction neu cham nhieu bang:

```php
DB::beginTransaction();
try {
    ...
    DB::commit();
} catch (Exception $exception) {
    DB::rollBack();
    throw $exception;
}
```

### 20.9 Routes

Them vao `routes/api.php`:

```php
Route::prefix('projects')
    ->name('project.')
    ->group(function () {
        Route::get('', [ProjectController::class, 'list'])->name('list');
        Route::post('', [ProjectController::class, 'create'])->name('create');
        Route::prefix('{id}')
            ->middleware('model.exists:' . Project::class)
            ->group(function () {
                Route::get('', [ProjectController::class, 'getDetail'])->name('detail');
                Route::put('', [ProjectController::class, 'update'])->name('update');
                Route::delete('', [ProjectController::class, 'delete'])->name('delete');
            });
    });
```

Neu dung `model.exists`, them mapping trong `CheckAvailableModel`.

### 20.10 Message lang

Them message vao:

```text
resources/lang/en/message.php
```

Controller nen dung:

```php
__('message.success.project.created')
```

Khong hard-code message truc tiep trong controller.

## 21. Checklist nhan ban kien truc sang he thong moi

### 21.1 Nen giu nguyen

- Folder layer: `Controller -> Request -> Business -> Repository -> Model -> Resource`.
- `ResponseFactory` de chuan hoa API response.
- `BaseFormRequest` de chuan hoa validation error.
- `BaseJsonResource` va `BaseCollectionResource`.
- `BaseRepository` cho CRUD co ban.
- Interface + implementation cho repository.
- Service provider bind dependency.
- Constant theo module.
- Request logging va error logging.
- Transaction trong controller cho write action phuc tap.
- Docker local development.

### 21.2 Nen cai tien khi dung cho he thong moi

- Them type hints return ro rang hon trong service/repository.
- Giam static facade `Business::...` va `Repository::...` neu muon test de hon; co the chuyen sang constructor injection.
- Them unit/feature test that su, hien `tests` moi la skeleton.
- Bat permission middleware neu co RBAC production.
- Them timeout/retry cho `HttpClient`.
- Khong disable SSL verify o production.
- Cai thien JWT exception handling trong `CheckAvailableUser` de bat decode exception truc tiep.
- Them OpenAPI/Swagger hoac API docs.
- Them schedule cho console commands neu can reminder tu dong.
- Chuan hoa naming cu, vi mot so ten cu con sot lai nhu `role_evaluations`.
- Kiem tra `QueryBuilderTimestampProvider`: macro hien set `id` bang UUID, trong khi nhieu model id co ve la int. Neu he thong moi dung int auto increment thi can dieu chinh.

## 22. Rủi ro va diem can luu y

- Worktree hien co nhieu file modified/untracked, nen report nay phan tich theo trang thai filesystem hien tai, khong phai mot commit sach.
- `CheckAvailableUser` ap dung cho toan bo API group, nen endpoint public can tach route group rieng neu co.
- `BaseRepository::whereClause` bo qua condition khong nam trong `$fillable`; day la nguyen nhan de gap bug filter neu quen fillable.
- Mot so permission middleware trong route dang comment, can audit truoc production.
- `routes/console.php` chua schedule command reminder.
- SQL logging co the rat nang neu bat production.
- `HttpClient` dang `verify=false`, can can trong voi production.
- Validation error tra ve rule failed thay vi message; frontend phai biet cach render.
- Exception handler default 500 se che mat message neu `ENABLE_ERROR_DETAIL_RESPONSE=false`, tot cho production nhung kho debug neu local khong cau hinh.

## 23. Ban do file quan trong

| Muc dich | File |
|---|---|
| API routes | `routes/api.php` |
| Bootstrap middleware/routes | `bootstrap/app.php` |
| Provider registration | `bootstrap/providers.php` |
| Response factory | `app/Services/Api/ResponseFactory.php` |
| Service facade | `app/Services/Service.php` |
| Business facade | `app/Business/Business.php` |
| Repository facade | `app/Repositories/Repository.php` |
| Base repository | `app/Repositories/Base/BaseRepository.php` |
| Base request | `app/Http/Requests/BaseFormRequest.php` |
| Base resource | `app/Http/Resources/Base/BaseJsonResource.php` |
| Collection pagination resource | `app/Http/Resources/Base/BaseCollectionResource.php` |
| Auth middleware | `app/Http/Middleware/CheckAvailableUser.php` |
| Permission middleware | `app/Http/Middleware/CheckPermission.php` |
| Model exists middleware | `app/Http/Middleware/CheckAvailableModel.php` |
| Request logger | `app/Http/Middleware/RequestLogger.php` |
| Exception handler | `app/Exceptions/Handler.php` |
| Repository binding | `app/Providers/RepositoryServiceProvider.php` |
| API service binding | `app/Providers/ApiServiceProvider.php` |
| JWT/File binding | `app/Providers/AdditionServiceProvider.php` |
| SQL log provider | `app/Providers/DatabaseQueryServiceProvider.php` |
| Query builder macro | `app/Providers/QueryBuilderTimestampProvider.php` |
| External ACMS ME | `app/Business/ACMS/MEService.php` |
| External ACMS BO | `app/Business/ACMS/BOService.php` |
| HTTP client trait | `app/Traits/HttpClient.php` |
| Docker compose | `docker-compose.yml` |
| Env sample | `.env.example` |

## 24. Ket luan

Codebase nay phu hop lam backend standard cho cac he thong Laravel API noi bo:

- Co layer ro rang.
- Co repository pattern day du.
- Co response/validation/resource chuan.
- Co middleware auth/permission/model guard.
- Co logging request/error/sql.
- Co import/export/mail/queue/Docker.

Khi dung de dung he thong khac, nen lay skeleton layer va quy uoc module lam chuan. Phan nen uu tien cai tien la test coverage, API docs, dependency injection thay cho static facade neu can test tot, va hardening cac tich hop ngoai/JWT/logging cho moi truong production.
