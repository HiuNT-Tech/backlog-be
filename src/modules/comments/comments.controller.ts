import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFiles,
} from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@/types/jwt-payload.type';
import { UploadedFile, UseMultipleFilesUpload } from '@common/upload';
import {
  ATTACHMENT_MAX_FILE_SIZE_BYTES,
  ATTACHMENT_MAX_FILES,
  ATTACHMENT_MIME_TYPES,
} from '@modules/attachments/attachments.constants';
import {
  ApiCommentsControllerDocs,
  ApiCreateCommentDocs,
  ApiDeleteCommentDocs,
  ApiListCommentsDocs,
  ApiUpdateCommentDocs,
} from './decorators/comments-swagger.decorator';
import {
  CreateCommentDto,
  ListCommentsQueryDto,
  UpdateCommentDto,
} from './dto/comment.dto';
import { CommentsService } from './comments.service';

const commentUploadOptions = {
  fieldName: 'attachments',
  maxFiles: ATTACHMENT_MAX_FILES,
  maxSizeBytes: ATTACHMENT_MAX_FILE_SIZE_BYTES,
  required: false,
  allowedMimeTypes: ATTACHMENT_MIME_TYPES,
};

@ApiCommentsControllerDocs()
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @ApiCreateCommentDocs()
  @HttpCode(HttpStatus.CREATED)
  @Post('cards/:cardId/comments')
  @UseMultipleFilesUpload(commentUploadOptions)
  create(
    @CurrentUser() user: JwtPayload,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Body() dto: CreateCommentDto,
    @UploadedFiles() attachments: UploadedFile[],
  ) {
    return this.commentsService.create(user, cardId, dto, attachments);
  }

  @ApiListCommentsDocs()
  @Get('cards/:cardId/comments')
  findByCard(
    @CurrentUser() user: JwtPayload,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Query() query: ListCommentsQueryDto,
  ) {
    return this.commentsService.findByCard(user, cardId, query);
  }

  @ApiUpdateCommentDocs()
  @Put('comments/:id')
  @UseMultipleFilesUpload(commentUploadOptions)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommentDto,
    @UploadedFiles() attachments: UploadedFile[],
  ) {
    return this.commentsService.update(user, id, dto, attachments);
  }

  @ApiDeleteCommentDocs()
  @Delete('comments/:id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.commentsService.remove(user, id);
  }
}
