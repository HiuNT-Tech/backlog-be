import { ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '@common/constants/app.constant';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  override handleRequest(err: any, user: any, info: any) {
    if (info?.name === 'TokenExpiredError' || info?.message === 'jwt expired') {
      throw new BusinessException(
        ErrorCode.INVALID_TOKEN,
        HttpStatus.GONE,
        'Need to refresh token.',
      );
    }

    if (err || !user) {
      throw err || new BusinessException(
        ErrorCode.INVALID_TOKEN,
        HttpStatus.UNAUTHORIZED,
      );
    }

    return user;
  }
}
