import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { InvitationsModule } from '@modules/invitations/invitations.module';
import { UsersModule } from '@modules/users/users.module';
import {
  BrevoEmailProvider,
  EMAIL_PROVIDER,
} from '../../providers/brevo.provider';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    UsersModule,
    InvitationsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    JwtStrategy,
    RefreshTokenRepository,
    { provide: EMAIL_PROVIDER, useClass: BrevoEmailProvider },
  ],
})
export class AuthModule {}
