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
@Controller('boards/:id/versions')
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @ApiListVersionsDocs()
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Query() query: ListVersionsQueryDto,
  ) {
    return this.versionsService.findAll(user, boardId, query);
  }

  @ApiCreateVersionDocs()
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Body() dto: CreateVersionDto,
  ) {
    return this.versionsService.create(user, boardId, dto);
  }

  @ApiGetVersionDocs()
  @Get(':versionId')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
  ) {
    return this.versionsService.findOne(user, boardId, versionId);
  }

  @ApiUpdateVersionDocs()
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
  @Delete(':versionId')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
  ) {
    return this.versionsService.remove(user, boardId, versionId);
  }
}
