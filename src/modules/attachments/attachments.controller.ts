import { Controller, Get, Param, ParseIntPipe, Res } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@/types/jwt-payload.type';
import {
  ApiAttachmentsControllerDocs,
  ApiDownloadAttachmentDocs,
} from './decorators/attachments-swagger.decorator';
import { AttachmentsService } from './attachments.service';

@ApiAttachmentsControllerDocs()
@Controller()
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @ApiDownloadAttachmentDocs()
  @Get('attachments/:id/download')
  async download(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const target = await this.attachmentsService.getDownloadTarget(user, id);

    if (target.type === 'redirect') {
      res.redirect(302, target.url);
      return;
    }

    res.setHeader('Content-Type', target.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(target.fileName)}"`,
    );
    res.sendFile(target.absolutePath);
  }
}
