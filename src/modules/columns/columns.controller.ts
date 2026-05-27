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
@Controller('columns')
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @ApiListColumnsDocs()
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListColumnsQueryDto,
  ) {
    return this.columnsService.findAll(user, query);
  }

  @ApiCreateColumnDocs()
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateColumnDto) {
    return this.columnsService.create(user, dto);
  }

  @ApiUpdateColumnDocs()
  @Put(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateColumnDto,
  ) {
    return this.columnsService.update(user, id, dto);
  }

  @ApiDeleteColumnDocs()
  @Delete(':id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.columnsService.remove(user, id);
  }
}
