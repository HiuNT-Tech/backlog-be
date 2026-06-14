import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BoardInvitationStatus, BoardMemberRole } from '@prisma/client';
import { normalizeEmail } from '@common/utils/string.util';

export class CreateInvitationDto {
  @ApiProperty({
    example: 'member@example.com',
    description: 'Email address that will receive the board invitation.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  @IsEmail()
  email: string;

  @ApiProperty({
    enum: BoardMemberRole,
    example: BoardMemberRole.MEMBER,
    description: 'Board role assigned when the invitation is accepted.',
  })
  @IsEnum(BoardMemberRole)
  role: BoardMemberRole;
}

export class ListBoardInvitationsQueryDto {
  @ApiPropertyOptional({
    enum: BoardInvitationStatus,
    example: BoardInvitationStatus.PENDING,
    description: 'Filter invitations by status.',
  })
  @IsOptional()
  @IsEnum(BoardInvitationStatus)
  status?: BoardInvitationStatus;
}
