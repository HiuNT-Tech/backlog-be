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
} from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
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
@Controller('boards/:id/issue-types')
export class IssueTypesController {
  constructor(private readonly issueTypesService: IssueTypesService) {}

  @ApiListIssueTypesDocs()
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Query() query: ListIssueTypesQueryDto,
  ) {
    return this.issueTypesService.findAll(user, boardId, query);
  }

  @ApiCreateIssueTypeDocs()
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Body() dto: CreateIssueTypeDto,
  ) {
    return this.issueTypesService.create(user, boardId, dto);
  }

  @ApiUpdateIssueTypeDocs()
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
  @Delete(':issueTypeId')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Param('issueTypeId', ParseIntPipe) issueTypeId: number,
  ) {
    return this.issueTypesService.remove(user, boardId, issueTypeId);
  }
}
