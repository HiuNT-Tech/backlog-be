import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@/types/jwt-payload.type';
import {
  ApiAcceptInvitationDocs,
  ApiCreateInvitationDocs,
  ApiDeclineInvitationDocs,
  ApiGetInvitationByTokenDocs,
  ApiInvitationsControllerDocs,
  ApiListBoardInvitationsDocs,
  ApiListMyInvitationsDocs,
  ApiRevokeInvitationDocs,
} from './decorators/invitations-swagger.decorator';
import {
  CreateInvitationDto,
  ListBoardInvitationsQueryDto,
} from './dto/create-invitation.dto';
import { InvitationsService } from './invitations.service';

@ApiInvitationsControllerDocs()
@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @ApiCreateInvitationDocs()
  @HttpCode(HttpStatus.CREATED)
  @Post('boards/:id/invitations')
  createForBoard(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.createForBoard(user, boardId, dto);
  }

  @ApiListBoardInvitationsDocs()
  @Get('boards/:id/invitations')
  listForBoard(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Query() query: ListBoardInvitationsQueryDto,
  ) {
    return this.invitationsService.listForBoard(user, boardId, query);
  }

  @ApiRevokeInvitationDocs()
  @HttpCode(HttpStatus.OK)
  @Delete('boards/:id/invitations/:invitationId')
  revoke(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) boardId: number,
    @Param('invitationId', ParseIntPipe) invitationId: number,
  ) {
    return this.invitationsService.revoke(user, boardId, invitationId);
  }

  @ApiGetInvitationByTokenDocs()
  @Public()
  @Get('invitations/:token')
  findByToken(@Param('token') token: string) {
    return this.invitationsService.findByToken(token);
  }

  @ApiAcceptInvitationDocs()
  @HttpCode(HttpStatus.OK)
  @Post('invitations/:token/accept')
  accept(@CurrentUser() user: JwtPayload, @Param('token') token: string) {
    return this.invitationsService.accept(user, token);
  }

  @ApiDeclineInvitationDocs()
  @HttpCode(HttpStatus.OK)
  @Post('invitations/:token/decline')
  decline(@CurrentUser() user: JwtPayload, @Param('token') token: string) {
    return this.invitationsService.decline(user, token);
  }

  @ApiListMyInvitationsDocs()
  @Get('me/invitations')
  listMine(@CurrentUser() user: JwtPayload) {
    return this.invitationsService.listMine(user);
  }
}
