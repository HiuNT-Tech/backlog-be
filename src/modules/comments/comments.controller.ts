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
} from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@/types/jwt-payload.type';
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

@ApiCommentsControllerDocs()
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @ApiCreateCommentDocs()
  @HttpCode(HttpStatus.CREATED)
  @Post('cards/:cardId/comments')
  create(
    @CurrentUser() user: JwtPayload,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(user, cardId, dto);
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
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(user, id, dto);
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
