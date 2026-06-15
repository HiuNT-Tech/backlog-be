import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '@common/dto/response.dto';
import { ApiItemResponse } from '@common/decorators/api-response.decorator';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';

const authDocs = [
  ApiCookieAuth('accessToken'),
  ApiBearerAuth('bearer'),
  ApiUnauthorizedResponse({
    description: 'Missing or invalid access token.',
    type: ApiErrorResponseDto,
  }),
  ApiResponse({
    status: 410,
    description: 'Access token expired. FE should refresh token then retry.',
    type: ApiErrorResponseDto,
  }),
];

export function ApiMeControllerDocs() {
  return applyDecorators(ApiTags('me'));
}

export function ApiGetProfileDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get my profile',
      description: 'Return the profile of the currently authenticated user.',
    }),
    ...authDocs,
    ApiItemResponse(UserResponseDto, {
      description: 'Current user profile.',
    }),
  );
}

export function ApiUpdateProfileDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update my profile',
      description: 'Update displayName, avatar, or phone of the current user.',
    }),
    ...authDocs,
    ApiItemResponse(UserResponseDto, {
      description: 'Updated profile.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid payload.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiChangePasswordDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Change password',
      description:
        'Verify current password then replace it with the new password.',
    }),
    ...authDocs,
    ApiNoContentResponse({ description: 'Password changed successfully.' }),
    ApiBadRequestResponse({
      description: 'Current password is incorrect or payload is invalid.',
      type: ApiErrorResponseDto,
    }),
  );
}
