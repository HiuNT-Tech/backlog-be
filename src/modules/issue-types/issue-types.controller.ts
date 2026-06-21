import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { BOARD_MANAGER_ROLES } from '@modules/boards/board-access.service';
import {
  BoardMember,
  BoardRoles,
} from '@modules/boards/decorators/board-roles.decorator';
import { BoardRolesGuard } from '@modules/boards/guards/board-roles.guard';
import { JwtPayload } from '@/types/jwt-payload.type';
import {
  CreateIssueTypeDto,
  ListIssueTypesQueryDto,
  UpdateIssueTypeDto,
} from './dto/issue-type.dto';
import {
  ApiCreateIssueTypeDocs,
  ApiDeleteIssueTypeDocs,
  ApiIssueTypesControllerDocs,
  ApiListIssueTypesDocs,
  ApiUpdateIssueTypeDocs,
} from './decorators/issue-types-swagger.decorator';
import { IssueTypesService } from './issue-types.service';

@ApiIssueTypesControllerDocs()
@UseGuards(BoardRolesGuard)
@Controller('boards/:id/issue-types')
export class IssueTypesController {
  constructor(private readonly issueTypesService: IssueTypesService) {}

  @ApiListIssueTypesDocs()
  @BoardMember()
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Query() query: ListIssueTypesQueryDto,
  ) {
    return this.issueTypesService.findAll(user, boardId, query);
  }

  @ApiCreateIssueTypeDocs()
  @BoardRoles(...BOARD_MANAGER_ROLES)
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Body() dto: CreateIssueTypeDto,
  ) {
    return this.issueTypesService.create(user, boardId, dto);
  }

  @ApiUpdateIssueTypeDocs()
  @BoardRoles(...BOARD_MANAGER_ROLES)
  @Put(':issueTypeId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Param('issueTypeId', ParseIntPipe) issueTypeId: number,
    @Body() dto: UpdateIssueTypeDto,
  ) {
    return this.issueTypesService.update(user, boardId, issueTypeId, dto);
  }

  @ApiDeleteIssueTypeDocs()
  @BoardRoles(...BOARD_MANAGER_ROLES)
  @Delete(':issueTypeId')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Param('issueTypeId', ParseIntPipe) issueTypeId: number,
  ) {
    return this.issueTypesService.remove(user, boardId, issueTypeId);
  }
}
