import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@common/enums/role.enum';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';
import {
  comparePassword,
  generateRandomToken,
} from '@common/utils/crypto.util';
import {
  getResetPasswordUrl,
  getVerificationUrl,
} from '@common/utils/url.util';
import { JwtPayload } from '@/types/jwt-payload.type';
import { UserEntity } from '@modules/users/entities/user.entity';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { InvitationsService } from '@modules/invitations/invitations.service';
import { UsersService } from '@modules/users/users.service';
import { EMAIL_PROVIDER, EmailProvider } from '../../providers/brevo.provider';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { TokenService } from './token.service';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

type UserResponse = {
  id: number;
  email: string;
  displayName: string;
  avatar: string | null;
  userCode: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type LoginResponse = UserResponse & {
  accessToken: string;
  refreshToken: string;
};

type TokenResponse = {
  accessToken: string;
  refreshToken: string;
};

type AuthUserSource = {
  id: number;
  email: string;
  displayName: string;
  avatar?: string | null;
  userCode?: string | null;
  role: Role | string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly configService: ConfigService,
    private readonly invitationsService: InvitationsService,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
  ) {}

  async register(dto: RegisterDto): Promise<UserResponse> {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new BusinessException(
        ErrorCode.USER_EMAIL_EXISTS,
        HttpStatus.CONFLICT,
      );
    }

    const newUser = await this.usersService.createForRegistration({
      email: dto.email,
      displayName: dto.displayName ?? dto.email.split('@')[0],
      password: dto.password,
      phone: dto.phone,
    });

    await this.sendVerificationEmail(newUser);

    return this.toUserResponse(new UserResponseDto(newUser));
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !user.isActive) {
      throw new BusinessException(
        ErrorCode.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const passwordMatched = await comparePassword(dto.password, user.password);

    if (!passwordMatched) {
      throw new BusinessException(
        ErrorCode.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.buildLoginResponse(user);
  }

  async verifyAccount(dto: {
    email: string;
    token: string;
  }): Promise<UserResponse> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new BusinessException(
        ErrorCode.USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (user.isActive) {
      throw new BusinessException(
        ErrorCode.USER_ALREADY_VERIFIED,
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    if (dto.token !== user.verifyToken) {
      throw new BusinessException(
        ErrorCode.INVALID_VERIFICATION_TOKEN,
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    const verifiedUser = await this.usersService.verifyAccount(
      user.id,
      dto.token,
    );
    await this.invitationsService.bindPendingByEmail(verifiedUser);

    return this.toUserResponse(verifiedUser);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(dto.email);

    if (user && user.isActive) {
      const token = generateRandomToken();
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await this.usersService.setResetPasswordToken(user.id, token, expiresAt);
      await this.sendResetPasswordEmail(user.email, token);
    }

    return {
      message: 'If the email exists, a password reset link has been sent',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new BusinessException(
        ErrorCode.USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!user.resetPasswordToken || user.resetPasswordToken !== dto.token) {
      throw new BusinessException(
        ErrorCode.INVALID_RESET_TOKEN,
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    if (
      !user.resetPasswordExpiresAt ||
      user.resetPasswordExpiresAt.getTime() < Date.now()
    ) {
      throw new BusinessException(
        ErrorCode.RESET_TOKEN_EXPIRED,
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    await this.usersService.resetPassword(user.id, dto.newPassword);
    await this.refreshTokenRepository.revokeAllForUser(user.id);

    return { message: 'Password has been reset successfully' };
  }

  async refreshToken(refreshToken: string | undefined): Promise<TokenResponse> {
    if (!refreshToken) {
      throw new BusinessException(
        ErrorCode.INVALID_TOKEN,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = this.tokenService.hashToken(refreshToken);
    const session = await this.refreshTokenRepository.findActiveByHash(
      payload.userId,
      tokenHash,
    );

    if (!session) {
      throw new BusinessException(
        ErrorCode.INVALID_TOKEN,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.usersService.findByIdForAuth(payload.userId);

    if (!user || !user.isActive) {
      throw new BusinessException(
        ErrorCode.INVALID_TOKEN,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const jwtPayload = this.toPayload(user);
    const [accessToken, newRefreshToken] = await Promise.all([
      this.tokenService.signAccessToken(jwtPayload),
      this.tokenService.signRefreshToken(jwtPayload),
    ]);
    const newTokenHash = this.tokenService.hashToken(newRefreshToken);
    await this.refreshTokenRepository.rotate({
      sessionId: session.id,
      userId: user.id,
      newTokenHash,
      newExpiresAt: this.tokenService.getTokenExpiresAt(newRefreshToken),
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.refreshTokenRepository.revokeByHash(
      this.tokenService.hashToken(refreshToken),
    );
  }

  async me(payload: JwtPayload): Promise<UserResponse> {
    const user = await this.usersService.findByIdForAuth(payload.userId);

    if (!user) {
      throw new BusinessException(
        ErrorCode.INVALID_TOKEN,
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!user.isActive) {
      throw new BusinessException(
        ErrorCode.USER_INACTIVE,
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.toUserResponse(new UserResponseDto(user));
  }

  private async sendVerificationEmail(user: UserEntity): Promise<void> {
    const existUser = await this.usersService.findByEmail(user.email);

    if (!existUser || !existUser.verifyToken) {
      throw new BusinessException(
        ErrorCode.VERIFICATION_TOKEN_MISSING,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const verificationUrl = getVerificationUrl(
      this.configService,
      existUser.email,
      existUser.verifyToken,
    );

    const customSubject =
      'Backlog: Please verify your email before using our services!';
    const htmlContent = `
      <h3>Here is your verification link:</h3>
      <h3>${verificationUrl}</h3>
    `;
    await this.emailProvider.sendEmail(
      existUser.email,
      customSubject,
      htmlContent,
    );
  }

  private async sendResetPasswordEmail(
    email: string,
    token: string,
  ): Promise<void> {
    const resetUrl = getResetPasswordUrl(this.configService, email, token);

    const customSubject = 'Backlog: Reset your password';
    const htmlContent = `
      <h3>Reset your password</h3>
      <p>Click the link below to set a new password. This link expires in 1 hour.</p>
      <h3>${resetUrl}</h3>
    `;
    await this.emailProvider.sendEmail(email, customSubject, htmlContent);
  }

  private async buildLoginResponse(user: UserEntity): Promise<LoginResponse> {
    const userDto = new UserResponseDto(user);
    const jwtPayload = this.toPayload(userDto);
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken(jwtPayload),
      this.tokenService.signRefreshToken(jwtPayload),
    ]);
    await this.refreshTokenRepository.create({
      userId: userDto.id,
      tokenHash: this.tokenService.hashToken(refreshToken),
      expiresAt: this.tokenService.getTokenExpiresAt(refreshToken),
    });

    return {
      ...this.toUserResponse(userDto),
      accessToken,
      refreshToken,
    };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
    try {
      return await this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new BusinessException(
        ErrorCode.INVALID_TOKEN,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  private toPayload(user: AuthUserSource): JwtPayload {
    return {
      userId: user.id,
      email: user.email,
      role: user.role as Role,
    };
  }

  private toUserResponse(user: UserResponseDto): UserResponse {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      userCode: user.userCode,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
