import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '@common/dto/response.dto';
import {
  ApiItemCreatedResponse,
  ApiItemResponse,
  ApiListResponse,
} from '@common/decorators/api-response.decorator';
import { BoardInvitationStatus } from '@prisma/client';
import { InvitationResponseDto } from '../dto/invitation-response.dto';

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

export function ApiInvitationsControllerDocs() {
  return applyDecorators(ApiTags('invitations'));
}

export function ApiCreateInvitationDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create board invitation',
      description:
        'Create a pending invitation for an email address and send the invitation email.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      example: 1,
      description: 'Board id.',
    }),
    ...authDocs,
    ApiItemCreatedResponse(InvitationResponseDto, {
      description: 'Invitation created.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid board id or invitation payload.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Current user is not ADMIN or PM on this board.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Board or inviter not found.',
      type: ApiErrorResponseDto,
    }),
    ApiConflictResponse({
      description: 'Pending invitation already exists or user is a member.',
      type: ApiErrorResponseDto,
    }),
    ApiServiceUnavailableResponse({
      description: 'Email provider is unavailable.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiListBoardInvitationsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List board invitations',
      description:
        'Return invitations on a board. Pending expired invitations are marked EXPIRED before listing.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      example: 1,
      description: 'Board id.',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: BoardInvitationStatus,
      example: BoardInvitationStatus.PENDING,
      description:
        'Optional invitation status filter: PENDING, ACCEPTED, DECLINED, REVOKED, or EXPIRED.',
    }),
    ...authDocs,
    ApiListResponse(InvitationResponseDto, {
      description: 'Board invitations.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid board id or invitation status filter.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Current user is not ADMIN or PM on this board.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Board not found.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiRevokeInvitationDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Revoke board invitation',
      description: 'Mark a pending board invitation as REVOKED.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      example: 1,
      description: 'Board id.',
    }),
    ApiParam({
      name: 'invitationId',
      type: Number,
      example: 10,
      description: 'Invitation id on the board.',
    }),
    ...authDocs,
    ApiItemResponse(InvitationResponseDto, {
      description: 'Invitation revoked.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid board id or invitation id.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Current user is not ADMIN or PM on this board.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Invitation not found.',
      type: ApiErrorResponseDto,
    }),
    ApiConflictResponse({
      description: 'Invitation has already been responded to.',
      type: ApiErrorResponseDto,
    }),
    ApiGoneResponse({
      description: 'Access token or invitation is expired.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiGetInvitationByTokenDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get invitation by token',
      description:
        'Return public invitation detail so FE can render accept/register state.',
    }),
    ApiParam({
      name: 'token',
      type: String,
      example: 'invitation-token',
      description: 'Invitation token from the email link.',
    }),
    ApiItemResponse(InvitationResponseDto, {
      description: 'Invitation detail.',
    }),
    ApiNotFoundResponse({
      description: 'Invitation not found.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiAcceptInvitationDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Accept invitation',
      description:
        'Accept a pending invitation for the logged-in user email and create or restore the board membership.',
    }),
    ApiParam({
      name: 'token',
      type: String,
      example: 'invitation-token',
      description: 'Invitation token from the email link.',
    }),
    ...authDocs,
    ApiItemResponse(InvitationResponseDto, {
      description: 'Invitation accepted.',
    }),
    ApiForbiddenResponse({
      description: 'Logged-in email does not match invitation email.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Invitation not found.',
      type: ApiErrorResponseDto,
    }),
    ApiConflictResponse({
      description: 'Invitation already responded or user already member.',
      type: ApiErrorResponseDto,
    }),
    ApiGoneResponse({
      description: 'Access token or invitation expired.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiDeclineInvitationDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Decline invitation',
      description: 'Decline a pending invitation for the logged-in user email.',
    }),
    ApiParam({
      name: 'token',
      type: String,
      example: 'invitation-token',
      description: 'Invitation token from the email link.',
    }),
    ...authDocs,
    ApiItemResponse(InvitationResponseDto, {
      description: 'Invitation declined.',
    }),
    ApiForbiddenResponse({
      description: 'Logged-in email does not match invitation email.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Invitation not found.',
      type: ApiErrorResponseDto,
    }),
    ApiConflictResponse({
      description: 'Invitation already responded.',
      type: ApiErrorResponseDto,
    }),
    ApiGoneResponse({
      description: 'Access token or invitation expired.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiListMyInvitationsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List current user invitations',
      description:
        'Return pending invitations for the logged-in user email or invitee user id.',
    }),
    ...authDocs,
    ApiListResponse(InvitationResponseDto, {
      description: 'Current user pending invitations.',
    }),
    ApiNotFoundResponse({
      description: 'Current user not found.',
      type: ApiErrorResponseDto,
    }),
  );
}
