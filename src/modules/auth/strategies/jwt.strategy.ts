import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from '@/types/jwt-payload.type';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';
import { UsersService } from '@modules/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secretOrKey = configService.getOrThrow<string>('jwt.accessSecret');

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.accessToken,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.usersService.findByIdForAuth(payload.userId);

    if (!user || !user.isActive) {
      throw new BusinessException(
        ErrorCode.INVALID_TOKEN,
        HttpStatus.UNAUTHORIZED,
      );
    }

    return {
      userId: user.id,
      email: user.email,
    };
  }
}
