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
@Controller('boards/:id/columns')
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @ApiListColumnsDocs()
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Query() query: ListColumnsQueryDto,
  ) {
    return this.columnsService.findAll(user, boardId, query);
  }

  @ApiCreateColumnDocs()
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Body() dto: CreateColumnDto,
  ) {
    return this.columnsService.create(user, boardId, dto);
  }

  @ApiUpdateColumnDocs()
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
  @Delete(':columnId')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Param('columnId', ParseIntPipe) columnId: number,
  ) {
    return this.columnsService.remove(user, boardId, columnId);
  }
}
