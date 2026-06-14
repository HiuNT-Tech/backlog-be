import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
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
    ApiCreatedResponse({
      description: 'Board created.',
      type: BoardResponseDto,
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

export function ApiListBoardsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List boards',
      description: 'Return boards where the current user is an active member.',
    }),
    ...authDocs,
    ApiOkResponse({
      description: 'Boards visible to current user.',
      type: BoardResponseDto,
      isArray: true,
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
    ApiOkResponse({
      description: 'Board detail.',
      type: BoardResponseDto,
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
    ApiOkResponse({
      description: 'Board updated.',
      type: BoardResponseDto,
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
    ApiOkResponse({
      description: 'Member role updated.',
      type: BoardMemberResponseDto,
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
