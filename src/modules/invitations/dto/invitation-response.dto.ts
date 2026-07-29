import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BoardInvitationStatus, BoardMemberRole } from '@prisma/client';

export class InvitationBoardResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Pro IP Partner Customer' })
  title: string;

  @ApiProperty({ example: 'PIPC' })
  boardCode: string;
}

export class InvitationUserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'User Name' })
  displayName: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  avatar: string | null;
}

export class InvitationResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  boardId: number;

  @ApiProperty({ example: 'member@example.com' })
  email: string;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 2 })
  inviteeUserId: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 1 })
  invitedByUserId: number | null;

  @ApiProperty({ enum: BoardMemberRole, example: BoardMemberRole.MEMBER })
  role: BoardMemberRole;

  @ApiProperty({
    enum: BoardInvitationStatus,
    example: BoardInvitationStatus.PENDING,
  })
  status: BoardInvitationStatus;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-06-21T00:00:00.000Z',
  })
  expiresAt: Date;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-06-15T00:00:00.000Z',
  })
  respondedAt: Date | null;

  @ApiProperty({ type: () => InvitationBoardResponseDto })
  board: InvitationBoardResponseDto;

  @ApiPropertyOptional({
    type: () => InvitationUserResponseDto,
    nullable: true,
  })
  invitee: InvitationUserResponseDto | null;

  @ApiPropertyOptional({
    type: () => InvitationUserResponseDto,
    nullable: true,
  })
  invitedBy: InvitationUserResponseDto | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-06-14T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-06-14T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    type: String,
    example: 'a1b2c3d4e5f6',
    description:
      'Raw invitation token. Only present in "my invitations" responses, so the FE can accept/decline directly without the email link.',
  })
  token?: string;
}
