import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
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
  ColumnResponseDto,
  DeleteColumnResponseDto,
} from '../dto/column-response.dto';

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

export function ApiColumnsControllerDocs() {
  return applyDecorators(ApiTags('columns'));
}

export function ApiListColumnsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List columns',
      description: 'Return ordered active columns for a board.',
    }),
    ...authDocs,
    ApiListResponse(ColumnResponseDto, {
      description: 'Board columns.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid query.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Current user is not a board member.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiCreateColumnDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create column',
      description: 'Create a new board column/status at the end of the board.',
    }),
    ...authDocs,
    ApiItemCreatedResponse(ColumnResponseDto, {
      description: 'Column created.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid column payload.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Current user is not ADMIN or PM on this board.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiUpdateColumnDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update column',
      description:
        'Update column metadata and optionally reorder cards within the column.',
    }),
    ApiParam({ name: 'id', type: Number, example: 1 }),
    ...authDocs,
    ApiItemResponse(ColumnResponseDto, {
      description: 'Column updated.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid column payload.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Current user is not ADMIN or PM on this board.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Column not found.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiDeleteColumnDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete column',
      description:
        'Soft delete a column and its cards, then normalize remaining column positions.',
    }),
    ApiParam({ name: 'id', type: Number, example: 1 }),
    ...authDocs,
    ApiItemResponse(DeleteColumnResponseDto, {
      description: 'Column and cards deleted.',
    }),
    ApiForbiddenResponse({
      description: 'Current user is not ADMIN or PM on this board.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Column not found.',
      type: ApiErrorResponseDto,
    }),
  );
}
