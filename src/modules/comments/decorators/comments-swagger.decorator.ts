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
import { CreateCommentDto, UpdateCommentDto } from '../dto/comment.dto';
import {
  CommentListResponseDto,
  CommentResponseDto,
  DeleteCommentResponseDto,
} from '../dto/comment-response.dto';

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

const cardIdParam = ApiParam({ name: 'cardId', type: Number, example: 1 });
const commentIdParam = ApiParam({ name: 'id', type: Number, example: 1 });

export function ApiCommentsControllerDocs() {
  return applyDecorators(ApiTags('comments'));
}

export function ApiListCommentsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List comments',
      description: 'Return paginated active comments for a card.',
    }),
    cardIdParam,
    ...authDocs,
    ApiOkResponse({
      description: 'Card comments.',
      type: CommentListResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Invalid query or card id.',
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

export function ApiCreateCommentDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create comment',
      description:
        'Add a comment to a card. Gửi dưới dạng multipart/form-data; ' +
        'có thể kèm ảnh/file qua field `attachments`.',
    }),
    cardIdParam,
    ApiMultipleFilesUploadDocs({
      fieldName: 'attachments',
      bodyType: CreateCommentDto,
      required: false,
      maxFiles: ATTACHMENT_MAX_FILES,
      allowedMimeTypes: ATTACHMENT_MIME_TYPES,
    }),
    ...authDocs,
    ApiItemCreatedResponse(CommentResponseDto, {
      description: 'Comment created.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid comment payload.',
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

export function ApiUpdateCommentDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update comment',
      description:
        'Update an own comment. Gửi multipart/form-data; có thể thêm file mới ' +
        'qua `attachments` và gỡ file cũ qua `removeAttachmentIds`.',
    }),
    commentIdParam,
    ApiMultipleFilesUploadDocs({
      fieldName: 'attachments',
      bodyType: UpdateCommentDto,
      required: false,
      maxFiles: ATTACHMENT_MAX_FILES,
      allowedMimeTypes: ATTACHMENT_MIME_TYPES,
    }),
    ...authDocs,
    ApiItemResponse(CommentResponseDto, {
      description: 'Comment updated.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid comment payload.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Current user is not the comment author.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Comment not found.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiDeleteCommentDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete comment',
      description: 'Soft delete an own comment.',
    }),
    commentIdParam,
    ...authDocs,
    ApiItemResponse(DeleteCommentResponseDto, {
      description: 'Comment deleted.',
    }),
    ApiForbiddenResponse({
      description: 'Current user is not the comment author.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Comment not found.',
      type: ApiErrorResponseDto,
    }),
  );
}
