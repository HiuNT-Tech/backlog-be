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
import { ApiMultipleFilesUploadDocs } from '@common/upload';
import {
  ATTACHMENT_MAX_FILES,
  ATTACHMENT_MIME_TYPES,
} from '@modules/attachments/attachments.constants';
import { CreateCardDto, UpdateCardDto } from '../dto/card.dto';
import {
  BoardCardsResponseDto,
  CardResponseDto,
  MoveCardResponseDto,
} from '../dto/card-response.dto';

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

export function ApiCardsControllerDocs() {
  return applyDecorators(ApiTags('cards'));
}

export function ApiCreateCardDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create card',
      description:
        'Create a card in a board column. Gửi multipart/form-data; ' +
        'có thể kèm ảnh/file qua field `attachments`.',
    }),
    ApiMultipleFilesUploadDocs({
      fieldName: 'attachments',
      bodyType: CreateCardDto,
      required: false,
      maxFiles: ATTACHMENT_MAX_FILES,
      allowedMimeTypes: ATTACHMENT_MIME_TYPES,
    }),
    ...authDocs,
    ApiItemCreatedResponse(CardResponseDto, { description: 'Card created.' }),
    ApiBadRequestResponse({
      description: 'Invalid card payload.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Current user is not a board member.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Board column, issue type, or version not found.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiGetCardDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get card detail',
      description: 'Return card detail by id.',
    }),
    ApiParam({ name: 'id', type: Number, example: 1 }),
    ...authDocs,
    ApiItemResponse(CardResponseDto, { description: 'Card detail.' }),
    ApiForbiddenResponse({
      description: 'Current user is not a board member.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Card not found.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiUpdateCardDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update card',
      description:
        'Update mutable card fields. Gửi multipart/form-data; có thể thêm ' +
        'file mới qua `attachments` và gỡ file cũ qua `removeAttachmentIds`.',
    }),
    ApiParam({ name: 'id', type: Number, example: 1 }),
    ApiMultipleFilesUploadDocs({
      fieldName: 'attachments',
      bodyType: UpdateCardDto,
      required: false,
      maxFiles: ATTACHMENT_MAX_FILES,
      allowedMimeTypes: ATTACHMENT_MIME_TYPES,
    }),
    ...authDocs,
    ApiItemResponse(CardResponseDto, { description: 'Card updated.' }),
    ApiBadRequestResponse({
      description: 'Invalid card payload.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Current user is not a board member.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Card not found.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiGetBoardCardsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List board cards',
      description: 'Return paginated cards for a board with filters.',
    }),
    ApiParam({ name: 'id', type: Number, example: 1 }),
    ...authDocs,
    ApiOkResponse({
      description: 'Board cards.',
      type: BoardCardsResponseDto,
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

export function ApiMoveCardDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Move card',
      description: 'Move a card between board columns and update positions.',
    }),
    ...authDocs,
    ApiItemResponse(MoveCardResponseDto, {
      description: 'Card moved.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid move payload.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Current user is not a board member.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Card or column not found.',
      type: ApiErrorResponseDto,
    }),
  );
}
