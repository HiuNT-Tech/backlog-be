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
  UploadedFiles,
} from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@/types/jwt-payload.type';
import { UploadedFile, UseMultipleFilesUpload } from '@common/upload';
import {
  ATTACHMENT_MAX_FILE_SIZE_BYTES,
  ATTACHMENT_MAX_FILES,
  ATTACHMENT_MIME_TYPES,
} from '@modules/attachments/attachments.constants';
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

const cardUploadOptions = {
  fieldName: 'attachments',
  maxFiles: ATTACHMENT_MAX_FILES,
  maxSizeBytes: ATTACHMENT_MAX_FILE_SIZE_BYTES,
  required: false,
  allowedMimeTypes: ATTACHMENT_MIME_TYPES,
};

@ApiCardsControllerDocs()
@Controller()
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @ApiCreateCardDocs()
  @HttpCode(HttpStatus.CREATED)
  @Post('cards')
  @UseMultipleFilesUpload(cardUploadOptions)
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCardDto,
    @UploadedFiles() attachments: UploadedFile[],
  ) {
    return this.cardsService.create(user, dto, attachments);
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
  @UseMultipleFilesUpload(cardUploadOptions)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCardDto,
    @UploadedFiles() attachments: UploadedFile[],
  ) {
    return this.cardsService.update(user, id, dto, attachments);
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
