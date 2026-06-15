import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNotAcceptableResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '@common/dto/response.dto';
import {
  ApiItemCreatedResponse,
  ApiItemResponse,
} from '@common/decorators/api-response.decorator';
import {
  AuthUserResponseDto,
  LoginResponseDto,
  LogoutResponseDto,
  MessageResponseDto,
  RefreshTokenResponseDto,
} from '../dto/auth-response.dto';

export function ApiAuthControllerDocs() {
  return applyDecorators(ApiTags('auth'));
}

export function ApiRegisterDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Register user',
      description:
        'Create an inactive user account and send verification email.',
    }),
    ApiItemCreatedResponse(AuthUserResponseDto, {
      description: 'User registered successfully.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid register payload.',
      type: ApiErrorResponseDto,
    }),
    ApiConflictResponse({
      description: 'Email already exists.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiLoginDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Login',
      description:
        'Authenticate an active user, set access/refresh token cookies, and return tokens.',
    }),
    ApiItemResponse(LoginResponseDto, {
      description: 'Login successful.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid login payload.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid credentials or inactive account.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiVerifyAccountDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Verify account',
      description: 'Activate a registered account using email and token.',
    }),
    ApiItemResponse(AuthUserResponseDto, {
      description: 'Account verified successfully.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid verify-account payload.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'User not found.',
      type: ApiErrorResponseDto,
    }),
    ApiNotAcceptableResponse({
      description: 'User already verified or token is invalid.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiForgotPasswordDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Forgot password',
      description:
        'Send a password reset link if an active account exists for the email. ' +
        'Always returns success to avoid leaking whether the email is registered.',
    }),
    ApiItemResponse(MessageResponseDto, {
      description: 'Request accepted.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid payload.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiResetPasswordDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Reset password',
      description:
        'Reset the account password using the emailed token, then revoke all sessions.',
    }),
    ApiItemResponse(MessageResponseDto, {
      description: 'Password reset successfully.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid payload.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'User not found.',
      type: ApiErrorResponseDto,
    }),
    ApiNotAcceptableResponse({
      description: 'Reset token is invalid or expired.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiLogoutDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Logout',
      description:
        'Revoke refresh-token session if present and clear auth cookies.',
    }),
    ApiCookieAuth('refreshToken'),
    ApiItemResponse(LogoutResponseDto, {
      description: 'Logout successful.',
    }),
  );
}

export function ApiRefreshTokenDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Refresh token',
      description:
        'Rotate refresh token, set new access/refresh token cookies, and return tokens.',
    }),
    ApiCookieAuth('refreshToken'),
    ApiItemResponse(RefreshTokenResponseDto, {
      description: 'Refresh token rotation successful.',
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid refresh token.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiCurrentUserDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get current user',
      description:
        'Return the current authenticated user from access-token cookie or bearer token.',
    }),
    ApiCookieAuth('accessToken'),
    ApiBearerAuth('bearer'),
    ApiItemResponse(AuthUserResponseDto, {
      description: 'Current user.',
    }),
    ApiUnauthorizedResponse({
      description: 'Missing/invalid token or inactive user.',
      type: ApiErrorResponseDto,
    }),
    ApiResponse({
      status: 410,
      description:
        'Access token expired. FE should call refresh_token then retry.',
      type: ApiErrorResponseDto,
    }),
  );
}
