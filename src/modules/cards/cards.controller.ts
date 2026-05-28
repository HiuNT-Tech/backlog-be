import {
  Body,
  Controller,
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
  ApiCardsControllerDocs,
  ApiCreateCardDocs,
  ApiGetBoardCardsDocs,
  ApiGetCardDocs,
  ApiMoveCardDocs,
  ApiUpdateCardDocs,
} from './decorators/cards-swagger.decorator';
import {
  CreateCardDto,
  ListBoardCardsQueryDto,
  MoveCardDto,
  UpdateCardDto,
} from './dto/card.dto';
import { CardsService } from './cards.service';

@ApiCardsControllerDocs()
@Controller()
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @ApiCreateCardDocs()
  @HttpCode(HttpStatus.CREATED)
  @Post('cards')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCardDto) {
    return this.cardsService.create(user, dto);
  }

  @ApiGetCardDocs()
  @Get('cards/:id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cardsService.findOne(user, id);
  }

  @ApiUpdateCardDocs()
  @Put('cards/:id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCardDto,
  ) {
    return this.cardsService.update(user, id, dto);
  }

  @ApiGetBoardCardsDocs()
  @Get('boards/:id/cards')
  findByBoard(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Query() query: ListBoardCardsQueryDto,
  ) {
    return this.cardsService.findByBoard(user, boardId, query);
  }

  @ApiMoveCardDocs()
  @Put('boards/supports/moving_card')
  move(@CurrentUser() user: JwtPayload, @Body() dto: MoveCardDto) {
    return this.cardsService.move(user, dto);
  }
}
