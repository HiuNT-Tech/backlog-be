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
} from '@common/decorators/api-response.decorator';
import {
  DeleteIssueTypeResponseDto,
  IssueTypeResponseDto,
  IssueTypesResponseDto,
} from '../dto/issue-type-response.dto';

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

const boardIdParam = ApiParam({ name: 'id', type: Number, example: 1 });
const issueTypeIdParam = ApiParam({
  name: 'issueTypeId',
  type: Number,
  example: 1,
});

export function ApiIssueTypesControllerDocs() {
  return applyDecorators(ApiTags('issue-types'));
}

export function ApiListIssueTypesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List issue types',
      description: 'Return paginated active issue types for a board.',
    }),
    boardIdParam,
    ...authDocs,
    ApiOkResponse({
      description: 'Board issue types.',
      type: IssueTypesResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Invalid query or board id.',
      type: ApiErrorResponseDto,
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

export function ApiCreateIssueTypeDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create issue type',
      description: 'Create an issue type for a board.',
    }),
    boardIdParam,
    ...authDocs,
    ApiItemCreatedResponse(IssueTypeResponseDto, {
      description: 'Issue type created.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid issue-type payload.',
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
      description: 'Issue type name already exists.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiUpdateIssueTypeDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update issue type',
      description: 'Update issue type name or display color.',
    }),
    boardIdParam,
    issueTypeIdParam,
    ...authDocs,
    ApiItemResponse(IssueTypeResponseDto, {
      description: 'Issue type updated.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid issue-type payload.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Current user is not ADMIN or PM on this board.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Board or issue type not found.',
      type: ApiErrorResponseDto,
    }),
    ApiConflictResponse({
      description: 'Issue type name already exists.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiDeleteIssueTypeDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete issue type',
      description: 'Soft delete a board issue type.',
    }),
    boardIdParam,
    issueTypeIdParam,
    ...authDocs,
    ApiItemResponse(DeleteIssueTypeResponseDto, {
      description: 'Issue type deleted.',
    }),
    ApiForbiddenResponse({
      description: 'Current user is not ADMIN or PM on this board.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Board or issue type not found.',
      type: ApiErrorResponseDto,
    }),
  );
}
