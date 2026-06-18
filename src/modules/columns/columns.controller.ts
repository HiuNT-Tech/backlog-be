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
  ApiColumnsControllerDocs,
  ApiCreateColumnDocs,
  ApiDeleteColumnDocs,
  ApiListColumnsDocs,
  ApiUpdateColumnDocs,
} from './decorators/columns-swagger.decorator';
import {
  CreateColumnDto,
  ListColumnsQueryDto,
  UpdateColumnDto,
} from './dto/column.dto';
import { ColumnsService } from './columns.service';

@ApiColumnsControllerDocs()
@UseGuards(BoardRolesGuard)
@Controller('boards/:id/columns')
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @ApiListColumnsDocs()
  @BoardMember()
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Query() query: ListColumnsQueryDto,
  ) {
    return this.columnsService.findAll(user, boardId, query);
  }

  @ApiCreateColumnDocs()
  @BoardRoles(...BOARD_MANAGER_ROLES)
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Body() dto: CreateColumnDto,
  ) {
    return this.columnsService.create(user, boardId, dto);
  }

  @ApiUpdateColumnDocs()
  @BoardRoles(...BOARD_MANAGER_ROLES)
  @Put(':columnId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Param('columnId', ParseIntPipe) columnId: number,
    @Body() dto: UpdateColumnDto,
  ) {
    return this.columnsService.update(user, boardId, columnId, dto);
  }

  @ApiDeleteColumnDocs()
  @BoardRoles(...BOARD_MANAGER_ROLES)
  @Delete(':columnId')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Param('columnId', ParseIntPipe) columnId: number,
  ) {
    return this.columnsService.remove(user, boardId, columnId);
  }
}
