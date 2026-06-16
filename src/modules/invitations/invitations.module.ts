import { Module } from '@nestjs/common';
import { BoardMembersModule } from '@modules/board-members/board-members.module';
import { BoardsModule } from '@modules/boards/boards.module';
import { UsersModule } from '@modules/users/users.module';
import { BrevoEmailProvider, EMAIL_PROVIDER } from '@/providers/brevo.provider';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { InvitationsRepository } from './repositories/invitations.repository';

@Module({
  imports: [BoardMembersModule, BoardsModule, UsersModule],
  controllers: [InvitationsController],
  providers: [
    InvitationsService,
    InvitationsRepository,
    { provide: EMAIL_PROVIDER, useClass: BrevoEmailProvider },
  ],
  exports: [InvitationsService],
})
export class InvitationsModule {}
