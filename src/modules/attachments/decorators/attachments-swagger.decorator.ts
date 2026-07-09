import { applyDecorators } from '@nestjs/common';
import {
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

export function ApiAttachmentsControllerDocs() {
  return applyDecorators(ApiTags('attachments'));
}

export function ApiDownloadAttachmentDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Download attachment',
      description:
        'Trả nội dung file (redirect tới presigned URL nếu dùng S3, hoặc ' +
        'stream trực tiếp nếu lưu local). Chỉ thành viên board chứa ' +
        'comment/card sở hữu attachment mới truy cập được.',
    }),
    ApiParam({ name: 'id', type: Number, example: 1 }),
    ...authDocs,
    ApiForbiddenResponse({
      description: 'Current user is not a board member.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Attachment not found.',
      type: ApiErrorResponseDto,
    }),
  );
}
