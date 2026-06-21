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
  CreateVersionDto,
  ListVersionsQueryDto,
  UpdateVersionDto,
} from './dto/version.dto';
import {
  ApiCreateVersionDocs,
  ApiDeleteVersionDocs,
  ApiGetVersionDocs,
  ApiListVersionsDocs,
  ApiUpdateVersionDocs,
  ApiVersionsControllerDocs,
} from './decorators/versions-swagger.decorator';
import { VersionsService } from './versions.service';

@ApiVersionsControllerDocs()
@UseGuards(BoardRolesGuard)
@Controller('boards/:id/versions')
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @ApiListVersionsDocs()
  @BoardMember()
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Query() query: ListVersionsQueryDto,
  ) {
    return this.versionsService.findAll(user, boardId, query);
  }

  @ApiCreateVersionDocs()
  @BoardRoles(...BOARD_MANAGER_ROLES)
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Body() dto: CreateVersionDto,
  ) {
    return this.versionsService.create(user, boardId, dto);
  }

  @ApiGetVersionDocs()
  @BoardMember()
  @Get(':versionId')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
  ) {
    return this.versionsService.findOne(user, boardId, versionId);
  }

  @ApiUpdateVersionDocs()
  @BoardRoles(...BOARD_MANAGER_ROLES)
  @Put(':versionId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
    @Body() dto: UpdateVersionDto,
  ) {
    return this.versionsService.update(user, boardId, versionId, dto);
  }

  @ApiDeleteVersionDocs()
  @BoardRoles(...BOARD_MANAGER_ROLES)
  @Delete(':versionId')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
  ) {
    return this.versionsService.remove(user, boardId, versionId);
  }
}
