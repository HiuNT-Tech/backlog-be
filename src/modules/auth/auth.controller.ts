import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { RateLimit } from '@common/decorators/rate-limit.decorator';
import { JwtPayload } from '@/types/jwt-payload.type';
import { VerifyAccountDto } from '@modules/users/dto/verify-account.dto';
import { AuthService } from './auth.service';
import {
  ApiAuthControllerDocs,
  ApiCurrentUserDocs,
  ApiLoginDocs,
  ApiLogoutDocs,
  ApiRefreshTokenDocs,
  ApiRegisterDocs,
  ApiVerifyAccountDocs,
} from './decorators/auth-swagger.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const COOKIE_MAX_AGE = 14 * 24 * 60 * 60 * 1000;

type AuthTokenPair = {
  accessToken: string;
  refreshToken: string;
};

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    maxAge: COOKIE_MAX_AGE,
  };
};

@ApiAuthControllerDocs()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiRegisterDocs()
  @Public()
  @RateLimit(5)
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiLoginDocs()
  @Public()
  @RateLimit(5)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);

    this.setAuthCookies(response, result);

    return result;
  }

  @ApiVerifyAccountDocs()
  @Public()
  @RateLimit(5)
  @HttpCode(HttpStatus.OK)
  @Post('verify-account')
  verifyAccount(@Body() dto: VerifyAccountDto) {
    return this.authService.verifyAccount(dto);
  }

  @ApiLogoutDocs()
  @Public()
  @HttpCode(HttpStatus.OK)
  @Delete('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      typeof request.cookies?.refreshToken === 'string'
        ? request.cookies.refreshToken
        : undefined;
    await this.authService.logout(refreshToken);

    this.clearAuthCookies(response);

    return { message: 'Logged out successfully' };
  }

  @ApiRefreshTokenDocs()
  @Public()
  @RateLimit(10)
  @Get('refresh_token')
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      typeof request.cookies?.refreshToken === 'string'
        ? request.cookies.refreshToken
        : undefined;
    const result = await this.authService.refreshToken(refreshToken);

    this.setAuthCookies(response, result);

    return result;
  }

  @ApiCurrentUserDocs()
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user);
  }

  private setAuthCookies(response: Response, tokens: AuthTokenPair) {
    const cookieOptions = getCookieOptions();

    response.cookie('accessToken', tokens.accessToken, cookieOptions);
    response.cookie('refreshToken', tokens.refreshToken, cookieOptions);
  }

  private clearAuthCookies(response: Response) {
    const cookieOptions = getCookieOptions();

    response.clearCookie('accessToken', cookieOptions);
    response.clearCookie('refreshToken', cookieOptions);
  }
}
