import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '@/types/jwt-payload.type';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    const jwtPayload: JwtPayload = user;
    return data ? jwtPayload[data] : jwtPayload;
  },
);
