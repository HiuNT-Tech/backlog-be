import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '@common/dto/response.dto';
import {
  ApiItemCreatedResponse,
  ApiItemResponse,
  ApiListResponse,
} from '@common/decorators/api-response.decorator';
import {
  BoardMemberResponseDto,
  BoardResponseDto,
  BoardUsersResponseDto,
} from '../dto/board-response.dto';

const authDocs = [
  ApiCookieAuth('accessToken'),
  ApiBearerAuth('bearer'),
  ApiUnauthorizedResponse({
    description: 'Missing or invalid access token.',
    type: ApiErrorResponseDto,
  }),
  ApiResponse({
    status: 410,
    description: 'Access token expired. FE should refresh token then retry.',
    type: ApiErrorResponseDto,
  }),
];

export function ApiBoardsControllerDocs() {
  return applyDecorators(ApiTags('boards'));
}

export function ApiCreateBoardDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create board',
      description:
        'Create a board, assign current user as ADMIN, and create default columns.',
    }),
    ...authDocs,
    ApiItemCreatedResponse(BoardResponseDto, {
      description: 'Board created.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid board payload.',
      type: ApiErrorResponseDto,
    }),
    ApiConflictResponse({
      description: 'Board code already exists.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiDuplicateBoardDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Duplicate board',
      description:
        'Create a new board by copying columns, issue types, versions and cards from the source board. Comments, attachments and edit history are not copied. The current user becomes the sole ADMIN of the new board.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      example: 1,
      description: 'Source board id.',
    }),
    ...authDocs,
    ApiItemCreatedResponse(BoardResponseDto, {
      description: 'New board created from the source board.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid payload.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Current user is not a member of the source board.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Source board not found.',
      type: ApiErrorResponseDto,
    }),
    ApiConflictResponse({
      description: 'boardCode already exists.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiCreateSampleBoardDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create sample board',
      description:
        'Create a ready-to-explore sample board so users new to the tool can see how a real project is organised. Seeds the default columns plus sample issue types, milestones and tickets (some assigned to the caller, one already overdue). The sample content lives in code — no source board is required. The current user becomes the sole ADMIN.',
    }),
    ...authDocs,
    ApiItemCreatedResponse(BoardResponseDto, {
      description: 'Sample board created.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid payload.',
      type: ApiErrorResponseDto,
    }),
    ApiConflictResponse({
      description: 'boardCode already exists.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiListBoardsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List boards',
      description: 'Return boards where the current user is an active member.',
    }),
    ...authDocs,
    ApiListResponse(BoardResponseDto, {
      description: 'Boards visible to current user.',
    }),
  );
}

export function ApiGetBoardDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get board detail',
      description:
        'Return a board with ordered columns and cards assigned to each column.',
    }),
    ApiParam({ name: 'id', type: Number, example: 1 }),
    ...authDocs,
    ApiItemResponse(BoardResponseDto, {
      description: 'Board detail.',
    }),
    ApiNotFoundResponse({
      description: 'Board not found.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Current user is not a board member.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiUpdateBoardDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update board',
      description:
        'Update board metadata and optionally reorder columns by position.',
    }),
    ApiParam({ name: 'id', type: Number, example: 1 }),
    ...authDocs,
    ApiItemResponse(BoardResponseDto, {
      description: 'Board updated.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid update payload.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Current user is not ADMIN or PM on this board.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Board not found.',
      type: ApiErrorResponseDto,
    }),
    ApiConflictResponse({
      description: 'Board code already exists.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiUpdateMemberRoleDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update member role',
      description: 'Change a board member role. ADMIN/PM only.',
    }),
    ApiParam({ name: 'id', type: Number, example: 1 }),
    ApiParam({ name: 'userId', type: Number, example: 2 }),
    ...authDocs,
    ApiItemResponse(BoardMemberResponseDto, {
      description: 'Member role updated.',
    }),
    ApiForbiddenResponse({
      description: 'Current user is not ADMIN or PM on this board.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Board or member not found.',
      type: ApiErrorResponseDto,
    }),
    ApiConflictResponse({
      description: 'Cannot demote the last admin.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiRemoveMemberDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Remove board member',
      description:
        'Remove a member from the board (soft delete). ADMIN/PM only.',
    }),
    ApiParam({ name: 'id', type: Number, example: 1 }),
    ApiParam({ name: 'userId', type: Number, example: 2 }),
    ...authDocs,
    ApiOkResponse({ description: 'Member removed.' }),
    ApiForbiddenResponse({
      description: 'Current user is not ADMIN or PM on this board.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Board or member not found.',
      type: ApiErrorResponseDto,
    }),
    ApiConflictResponse({
      description: 'Cannot remove the last admin.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiGetBoardUsersDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List board users',
      description:
        'Return board members joined with user profile fields, with search and pagination.',
    }),
    ApiParam({ name: 'id', type: Number, example: 1 }),
    ...authDocs,
    ApiOkResponse({
      description: 'Board users.',
      type: BoardUsersResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Current user is not a board member.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Board not found.',
      type: ApiErrorResponseDto,
    }),
  );
}
