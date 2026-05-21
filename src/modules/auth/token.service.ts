import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { JwtPayload } from '@/types/jwt-payload.type';

type TokenPayload = Pick<JwtPayload, 'userId' | 'email' | 'role'>;

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  signAccessToken(payload: TokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, this.getAccessTokenOptions());
  }

  signRefreshToken(payload: TokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, this.getRefreshTokenOptions());
  }

  verifyRefreshToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
    });
  }

  private getAccessTokenOptions(): JwtSignOptions {
    return {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: this.configService.getOrThrow<string>(
        'jwt.accessExpiresIn',
      ) as JwtSignOptions['expiresIn'],
    };
  }

  private getRefreshTokenOptions(): JwtSignOptions {
    return {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: this.configService.getOrThrow<string>(
        'jwt.refreshExpiresIn',
      ) as JwtSignOptions['expiresIn'],
    };
  }
}
