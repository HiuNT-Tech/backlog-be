import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '@common/decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { LegacyRegisterDto } from '@modules/users/dto/legacy-register.dto';
import { VerifyAccountDto } from '@modules/users/dto/verify-account.dto';

const COOKIE_MAX_AGE = 14 * 24 * 60 * 60 * 1000;

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    maxAge: COOKIE_MAX_AGE,
  };
};

@Controller('users')
export class LegacyUsersController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: LegacyRegisterDto,
    @Res() response: Response,
  ): Promise<void> {
    const user = await this.authService.legacyRegister(dto);
    response.status(HttpStatus.CREATED).json(user);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res() response: Response): Promise<void> {
    const result = await this.authService.legacyLogin(dto);
    const cookieOptions = getCookieOptions();

    response.cookie('accessToken', result.accessToken, cookieOptions);
    response.cookie('refreshToken', result.refreshToken, cookieOptions);
    response.status(HttpStatus.OK).json(result);
  }

  @Public()
  @Post('verify-account')
  async verifyAccount(
    @Body() dto: VerifyAccountDto,
    @Res() response: Response,
  ): Promise<void> {
    const user = await this.authService.verifyAccount(dto);
    response.status(HttpStatus.OK).json(user);
  }

  @Public()
  @Delete('logout')
  logout(@Res() response: Response): void {
    response.clearCookie('accessToken');
    response.clearCookie('refreshToken');
    response.status(HttpStatus.OK).json({ message: 'Logged out successfully' });
  }

  @Public()
  @Get('refresh_token')
  async refreshToken(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const refreshToken =
      typeof request.cookies?.refreshToken === 'string'
        ? request.cookies.refreshToken
        : undefined;
    const result = await this.authService.refreshToken(refreshToken);

    response.cookie('accessToken', result.accessToken, getCookieOptions());
    response.status(HttpStatus.OK).json(result);
  }
}
