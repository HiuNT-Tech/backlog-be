import { mock, MockProxy } from 'jest-mock-extended';
import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';
import * as cryptoUtil from '@common/utils/crypto.util';
import * as urlUtil from '@common/utils/url.util';
import { EmailProvider } from '@/providers/brevo.provider';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { InvitationsService } from '@modules/invitations/invitations.service';
import { UsersService } from '@modules/users/users.service';
import { AuthService } from './auth.service';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { TokenService } from './token.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { makeUserEntity } from '../../../test/factories/user.factory';
import { makeJwtPayload } from '../../../test/factories/jwt-payload.factory';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: MockProxy<UsersService>;
  let tokenService: MockProxy<TokenService>;
  let refreshTokenRepository: MockProxy<RefreshTokenRepository>;
  let configService: MockProxy<ConfigService>;
  let invitationsService: MockProxy<InvitationsService>;
  let emailProvider: MockProxy<EmailProvider>;

  beforeEach(() => {
    usersService = mock<UsersService>();
    tokenService = mock<TokenService>();
    refreshTokenRepository = mock<RefreshTokenRepository>();
    configService = mock<ConfigService>();
    invitationsService = mock<InvitationsService>();
    emailProvider = mock<EmailProvider>();

    service = new AuthService(
      usersService,
      tokenService,
      refreshTokenRepository,
      configService,
      invitationsService,
      emailProvider,
    );

    // url.util reads from ConfigService; stub to deterministic strings so we
    // don't need to wire config keys for every test.
    jest
      .spyOn(urlUtil, 'getVerificationUrl')
      .mockReturnValue('https://fe.example.com/verify?token=abc');
    jest
      .spyOn(urlUtil, 'getResetPasswordUrl')
      .mockReturnValue('https://fe.example.com/reset?token=abc');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register', () => {
    const dto: RegisterDto = {
      email: 'new@example.com',
      displayName: 'New User',
      password: 'Password123!',
      phone: '0123456789',
    } as RegisterDto;

    it('should throw USER_EMAIL_EXISTS when the email is already registered', async () => {
      usersService.findByEmail.mockResolvedValue(makeUserEntity());

      await expect(service.register(dto)).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        response: { errorCode: ErrorCode.USER_EMAIL_EXISTS },
      });
      expect(usersService.createForRegistration).not.toHaveBeenCalled();
    });

    it('should create the user, send a verification email and return the mapped response', async () => {
      const created = makeUserEntity({
        id: 5,
        email: dto.email,
        verifyToken: 'verify-token',
        isActive: false,
      });
      // 1st findByEmail: existence check -> null; 2nd (inside sendVerificationEmail) -> created
      usersService.findByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(created);
      usersService.createForRegistration.mockResolvedValue(created);

      const result = await service.register(dto);

      expect(usersService.createForRegistration).toHaveBeenCalledWith({
        email: dto.email,
        displayName: dto.displayName,
        password: dto.password,
        phone: dto.phone,
      });
      expect(emailProvider.sendEmail).toHaveBeenCalledWith(
        created.email,
        expect.stringContaining('verify your email'),
        expect.stringContaining('https://fe.example.com/verify'),
      );
      expect(result).toEqual(
        expect.objectContaining({ id: 5, email: dto.email, isActive: false }),
      );
      expect(result).not.toHaveProperty('password');
    });

    it('should default displayName to the email local part when omitted', async () => {
      const created = makeUserEntity({
        email: 'jane@example.com',
        verifyToken: 'verify-token',
      });
      usersService.findByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(created);
      usersService.createForRegistration.mockResolvedValue(created);

      await service.register({
        email: 'jane@example.com',
        password: 'Password123!',
      } as RegisterDto);

      expect(usersService.createForRegistration).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'jane' }),
      );
    });

    it('should throw VERIFICATION_TOKEN_MISSING when the persisted user has no verify token', async () => {
      const created = makeUserEntity({ email: dto.email, verifyToken: null });
      usersService.findByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(created);
      usersService.createForRegistration.mockResolvedValue(created);

      await expect(service.register(dto)).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: { errorCode: ErrorCode.VERIFICATION_TOKEN_MISSING },
      });
      expect(emailProvider.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto: LoginDto = {
      email: 'user@example.com',
      password: 'Password123!',
    };

    it('should throw INVALID_CREDENTIALS when the user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        response: { errorCode: ErrorCode.INVALID_CREDENTIALS },
      });
    });

    it('should throw INVALID_CREDENTIALS when the user is inactive', async () => {
      usersService.findByEmail.mockResolvedValue(
        makeUserEntity({ isActive: false }),
      );

      await expect(service.login(dto)).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        response: { errorCode: ErrorCode.INVALID_CREDENTIALS },
      });
    });

    it('should throw INVALID_CREDENTIALS when the password does not match', async () => {
      usersService.findByEmail.mockResolvedValue(makeUserEntity());
      jest.spyOn(cryptoUtil, 'comparePassword').mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        response: { errorCode: ErrorCode.INVALID_CREDENTIALS },
      });
    });

    it('should return the user response with tokens and persist a refresh-token session on success', async () => {
      const user = makeUserEntity({ id: 9, email: dto.email });
      const expiresAt = new Date('2026-02-01T00:00:00Z');
      usersService.findByEmail.mockResolvedValue(user);
      jest.spyOn(cryptoUtil, 'comparePassword').mockResolvedValue(true);
      tokenService.signAccessToken.mockResolvedValue('access-token');
      tokenService.signRefreshToken.mockResolvedValue('refresh-token');
      tokenService.hashToken.mockReturnValue('refresh-hash');
      tokenService.getTokenExpiresAt.mockReturnValue(expiresAt);

      const result = await service.login(dto);

      expect(cryptoUtil.comparePassword).toHaveBeenCalledWith(
        dto.password,
        user.password,
      );
      expect(refreshTokenRepository.create).toHaveBeenCalledWith({
        userId: 9,
        tokenHash: 'refresh-hash',
        expiresAt,
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: 9,
          email: dto.email,
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        }),
      );
    });
  });

  describe('verifyAccount', () => {
    const dto = { email: 'user@example.com', token: 'verify-token' };

    it('should throw USER_NOT_FOUND when the user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.verifyAccount(dto)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.USER_NOT_FOUND },
      });
    });

    it('should throw USER_ALREADY_VERIFIED when the user is already active', async () => {
      usersService.findByEmail.mockResolvedValue(
        makeUserEntity({ isActive: true }),
      );

      await expect(service.verifyAccount(dto)).rejects.toMatchObject({
        status: HttpStatus.NOT_ACCEPTABLE,
        response: { errorCode: ErrorCode.USER_ALREADY_VERIFIED },
      });
    });

    it('should throw INVALID_VERIFICATION_TOKEN when the token does not match', async () => {
      usersService.findByEmail.mockResolvedValue(
        makeUserEntity({ isActive: false, verifyToken: 'other-token' }),
      );

      await expect(service.verifyAccount(dto)).rejects.toMatchObject({
        status: HttpStatus.NOT_ACCEPTABLE,
        response: { errorCode: ErrorCode.INVALID_VERIFICATION_TOKEN },
      });
    });

    it('should verify the account, bind pending invitations and return the response', async () => {
      usersService.findByEmail.mockResolvedValue(
        makeUserEntity({ id: 3, isActive: false, verifyToken: dto.token }),
      );
      const verified = new UserResponseDto(
        makeUserEntity({ id: 3, isActive: true }),
      );
      usersService.verifyAccount.mockResolvedValue(verified);

      const result = await service.verifyAccount(dto);

      expect(usersService.verifyAccount).toHaveBeenCalledWith(3, dto.token);
      expect(invitationsService.bindPendingByEmail).toHaveBeenCalledWith(
        verified,
      );
      expect(result).toEqual(
        expect.objectContaining({ id: 3, isActive: true }),
      );
    });
  });

  describe('forgotPassword', () => {
    const dto = { email: 'user@example.com' };
    const genericMessage =
      'If the email exists, a password reset link has been sent';

    it('should set a reset token and send an email when the user exists and is active', async () => {
      const user = makeUserEntity({ id: 4, email: dto.email, isActive: true });
      usersService.findByEmail.mockResolvedValue(user);
      jest
        .spyOn(cryptoUtil, 'generateRandomToken')
        .mockReturnValue('reset-token');

      const result = await service.forgotPassword(dto);

      expect(usersService.setResetPasswordToken).toHaveBeenCalledWith(
        4,
        'reset-token',
        expect.any(Date),
      );
      expect(emailProvider.sendEmail).toHaveBeenCalledWith(
        dto.email,
        expect.stringContaining('Reset your password'),
        expect.stringContaining('https://fe.example.com/reset'),
      );
      expect(result).toEqual({ message: genericMessage });
    });

    it('should return the generic message without side effects when the user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword(dto);

      expect(usersService.setResetPasswordToken).not.toHaveBeenCalled();
      expect(emailProvider.sendEmail).not.toHaveBeenCalled();
      expect(result).toEqual({ message: genericMessage });
    });

    it('should return the generic message without side effects when the user is inactive', async () => {
      usersService.findByEmail.mockResolvedValue(
        makeUserEntity({ isActive: false }),
      );

      const result = await service.forgotPassword(dto);

      expect(usersService.setResetPasswordToken).not.toHaveBeenCalled();
      expect(emailProvider.sendEmail).not.toHaveBeenCalled();
      expect(result).toEqual({ message: genericMessage });
    });
  });

  describe('resetPassword', () => {
    const dto = {
      email: 'user@example.com',
      token: 'reset-token',
      newPassword: 'NewPassword123!',
    };

    it('should throw USER_NOT_FOUND when the user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.USER_NOT_FOUND },
      });
    });

    it('should throw INVALID_RESET_TOKEN when the token is missing or does not match', async () => {
      usersService.findByEmail.mockResolvedValue(
        makeUserEntity({ resetPasswordToken: 'different-token' }),
      );

      await expect(service.resetPassword(dto)).rejects.toMatchObject({
        status: HttpStatus.NOT_ACCEPTABLE,
        response: { errorCode: ErrorCode.INVALID_RESET_TOKEN },
      });
    });

    it('should throw RESET_TOKEN_EXPIRED when the token has expired', async () => {
      usersService.findByEmail.mockResolvedValue(
        makeUserEntity({
          resetPasswordToken: dto.token,
          resetPasswordExpiresAt: new Date(Date.now() - 1000),
        }),
      );

      await expect(service.resetPassword(dto)).rejects.toMatchObject({
        status: HttpStatus.NOT_ACCEPTABLE,
        response: { errorCode: ErrorCode.RESET_TOKEN_EXPIRED },
      });
    });

    it('should reset the password, revoke all sessions and return a success message', async () => {
      const user = makeUserEntity({
        id: 7,
        resetPasswordToken: dto.token,
        resetPasswordExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      usersService.findByEmail.mockResolvedValue(user);

      const result = await service.resetPassword(dto);

      expect(usersService.resetPassword).toHaveBeenCalledWith(
        7,
        dto.newPassword,
      );
      expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(7);
      expect(result).toEqual({
        message: 'Password has been reset successfully',
      });
    });
  });

  describe('refreshToken', () => {
    it('should throw INVALID_TOKEN when no refresh token is provided', async () => {
      await expect(service.refreshToken(undefined)).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        response: { errorCode: ErrorCode.INVALID_TOKEN },
      });
    });

    it('should throw INVALID_TOKEN when the refresh token fails verification', async () => {
      tokenService.verifyRefreshToken.mockRejectedValue(new Error('bad token'));

      await expect(service.refreshToken('rt')).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        response: { errorCode: ErrorCode.INVALID_TOKEN },
      });
    });

    it('should throw INVALID_TOKEN when there is no active session for the hash', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue(makeJwtPayload());
      tokenService.hashToken.mockReturnValue('hash');
      refreshTokenRepository.findActiveByHash.mockResolvedValue(null);

      await expect(service.refreshToken('rt')).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        response: { errorCode: ErrorCode.INVALID_TOKEN },
      });
    });

    it('should throw INVALID_TOKEN when the user is missing or inactive', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue(makeJwtPayload());
      tokenService.hashToken.mockReturnValue('hash');
      refreshTokenRepository.findActiveByHash.mockResolvedValue({
        id: 1,
      } as never);
      usersService.findByIdForAuth.mockResolvedValue(
        makeUserEntity({ isActive: false }),
      );

      await expect(service.refreshToken('rt')).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        response: { errorCode: ErrorCode.INVALID_TOKEN },
      });
    });

    it('should rotate the session and return the new token pair on success', async () => {
      const payload = makeJwtPayload({ userId: 8 });
      const user = makeUserEntity({ id: 8, isActive: true });
      const newExpiresAt = new Date('2026-03-01T00:00:00Z');
      tokenService.verifyRefreshToken.mockResolvedValue(payload);
      tokenService.hashToken
        .mockReturnValueOnce('old-hash')
        .mockReturnValueOnce('new-hash');
      refreshTokenRepository.findActiveByHash.mockResolvedValue({
        id: 55,
      } as never);
      usersService.findByIdForAuth.mockResolvedValue(user);
      tokenService.signAccessToken.mockResolvedValue('new-access');
      tokenService.signRefreshToken.mockResolvedValue('new-refresh');
      tokenService.getTokenExpiresAt.mockReturnValue(newExpiresAt);

      const result = await service.refreshToken('rt');

      expect(refreshTokenRepository.findActiveByHash).toHaveBeenCalledWith(
        8,
        'old-hash',
      );
      expect(refreshTokenRepository.rotate).toHaveBeenCalledWith({
        sessionId: 55,
        userId: 8,
        newTokenHash: 'new-hash',
        newExpiresAt,
      });
      expect(result).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
    });
  });

  describe('logout', () => {
    it('should do nothing when no refresh token is provided', async () => {
      await service.logout(undefined);

      expect(refreshTokenRepository.revokeByHash).not.toHaveBeenCalled();
    });

    it('should revoke the session by token hash when provided', async () => {
      tokenService.hashToken.mockReturnValue('hash');

      await service.logout('rt');

      expect(tokenService.hashToken).toHaveBeenCalledWith('rt');
      expect(refreshTokenRepository.revokeByHash).toHaveBeenCalledWith('hash');
    });
  });

  describe('me', () => {
    it('should throw INVALID_TOKEN when the user does not exist', async () => {
      usersService.findByIdForAuth.mockResolvedValue(null);

      await expect(service.me(makeJwtPayload())).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        response: { errorCode: ErrorCode.INVALID_TOKEN },
      });
    });

    it('should throw USER_INACTIVE when the user is inactive', async () => {
      usersService.findByIdForAuth.mockResolvedValue(
        makeUserEntity({ isActive: false }),
      );

      await expect(service.me(makeJwtPayload())).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        response: { errorCode: ErrorCode.USER_INACTIVE },
      });
    });

    it('should return the mapped user response when the user is active', async () => {
      usersService.findByIdForAuth.mockResolvedValue(
        makeUserEntity({ id: 2, isActive: true }),
      );

      const result = await service.me(makeJwtPayload({ userId: 2 }));

      expect(result).toEqual(
        expect.objectContaining({ id: 2, isActive: true }),
      );
      expect(result).not.toHaveProperty('password');
    });
  });
});
