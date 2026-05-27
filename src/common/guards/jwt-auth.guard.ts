import { ExecutionContext, Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '@common/constants/app.constant';

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
      throw new HttpException('Need to refresh token.', HttpStatus.GONE);
    }

    if (err || !user) {
      throw err || new UnauthorizedException('Unauthorized! (token not found)');
    }

    return user;
  }
}
