import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@/types/jwt-payload.type';
import {
  ApiBoardsControllerDocs,
  ApiCreateBoardDocs,
  ApiGetBoardDocs,
  ApiGetBoardUsersDocs,
  ApiListBoardsDocs,
  ApiRemoveMemberDocs,
  ApiUpdateBoardDocs,
  ApiUpdateMemberRoleDocs,
} from './decorators/boards-swagger.decorator';
import {
  CreateBoardDto,
  GetBoardDetailQueryDto,
  GetBoardUsersQueryDto,
  UpdateBoardDto,
  UpdateMemberRoleDto,
} from './dto/board.dto';
import { BoardsService } from './boards.service';

@ApiBoardsControllerDocs()
@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @ApiListBoardsDocs()
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.boardsService.findAll(user);
  }

  @ApiCreateBoardDocs()
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBoardDto) {
    return this.boardsService.create(user, dto);
  }

  @ApiGetBoardDocs()
  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetBoardDetailQueryDto,
  ) {
    return this.boardsService.findOne(user, id, query);
  }

  @ApiUpdateBoardDocs()
  @Put(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBoardDto,
  ) {
    return this.boardsService.update(user, id, dto);
  }

  @ApiGetBoardUsersDocs()
  @Get(':id/usersBoard')
  findUsers(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetBoardUsersQueryDto,
  ) {
    return this.boardsService.findUsers(user, id, query);
  }

  @ApiUpdateMemberRoleDocs()
  @Patch(':id/members/:userId')
  updateMemberRole(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.boardsService.updateMemberRole(user, id, userId, dto);
  }

  @ApiRemoveMemberDocs()
  @HttpCode(HttpStatus.OK)
  @Delete(':id/members/:userId')
  removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.boardsService.removeMember(user, id, userId);
  }
}
