import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
  DeleteVersionResponseDto,
  VersionResponseDto,
  VersionsResponseDto,
} from '../dto/version-response.dto';

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
const versionIdParam = ApiParam({
  name: 'versionId',
  type: Number,
  example: 1,
});

export function ApiVersionsControllerDocs() {
  return applyDecorators(ApiTags('versions'));
}

export function ApiListVersionsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List versions',
      description: 'Return paginated active versions for a board.',
    }),
    boardIdParam,
    ...authDocs,
    ApiOkResponse({
      description: 'Board versions.',
      type: VersionsResponseDto,
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

export function ApiCreateVersionDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create version',
      description: 'Create a board version or milestone.',
    }),
    boardIdParam,
    ...authDocs,
    ApiItemCreatedResponse(VersionResponseDto, {
      description: 'Version created.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid version payload.',
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
  );
}

export function ApiGetVersionDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get version',
      description: 'Return a single board version by id.',
    }),
    boardIdParam,
    versionIdParam,
    ...authDocs,
    ApiItemResponse(VersionResponseDto, {
      description: 'Version detail.',
    }),
    ApiForbiddenResponse({
      description: 'Current user is not a board member.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Board or version not found.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiUpdateVersionDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update version',
      description: 'Update mutable version fields.',
    }),
    boardIdParam,
    versionIdParam,
    ...authDocs,
    ApiItemResponse(VersionResponseDto, {
      description: 'Version updated.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid version payload.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Current user is not ADMIN or PM on this board.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Board or version not found.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiDeleteVersionDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete version',
      description: 'Soft delete a board version.',
    }),
    boardIdParam,
    versionIdParam,
    ...authDocs,
    ApiItemResponse(DeleteVersionResponseDto, {
      description: 'Version deleted.',
    }),
    ApiForbiddenResponse({
      description: 'Current user is not ADMIN or PM on this board.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Board or version not found.',
      type: ApiErrorResponseDto,
    }),
  );
}
