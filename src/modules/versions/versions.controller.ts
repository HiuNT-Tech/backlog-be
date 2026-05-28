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
import { VersionsService } from './versions.service';

@Controller('boards/:id/versions')
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Query() query: ListVersionsQueryDto,
  ) {
    return this.versionsService.findAll(user, boardId, query);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Body() dto: CreateVersionDto,
  ) {
    return this.versionsService.create(user, boardId, dto);
  }

  @Get(':versionId')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
  ) {
    return this.versionsService.findOne(user, boardId, versionId);
  }

  @Put(':versionId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
    @Body() dto: UpdateVersionDto,
  ) {
    return this.versionsService.update(user, boardId, versionId, dto);
  }

  @Delete(':versionId')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
  ) {
    return this.versionsService.remove(user, boardId, versionId);
  }
}
