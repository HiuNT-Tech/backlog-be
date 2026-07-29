import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BoardMemberRole, BoardType } from '@prisma/client';
import { StatusColor } from '@common/types';

export class BoardMemberResponseDto {
  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ enum: BoardMemberRole, example: BoardMemberRole.ADMIN })
  role: BoardMemberRole;
}

export class BoardCardResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  boardId: number;

  @ApiProperty({ example: 1 })
  columnId: number;

  @ApiProperty({ example: 4119 })
  cardNumber: number;

  @ApiProperty({ example: 'PIPC-4119' })
  cardCode: string;

  @ApiProperty({ example: 'Issue title' })
  title: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '' })
  description: string | null;

  @ApiPropertyOptional({
    example: 2,
    nullable: true,
    description: 'Priority: 1=LOW, 2=MEDIUM, 3=HIGH',
  })
  priority: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 1 })
  assigneeUserId: number | null;

  @ApiProperty({ example: 0 })
  position: number;

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  updatedAt: Date;
}

export class BoardColumnResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  boardId: number;

  @ApiProperty({ example: 'To Do' })
  title: string;

  @ApiProperty({ example: 7 })
  statusColor: StatusColor;

  @ApiProperty({ example: 0 })
  position: number;

  @ApiProperty({ type: [BoardCardResponseDto] })
  cards: BoardCardResponseDto[];

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  updatedAt: Date;
}

export class BoardResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Project' })
  title: string;

  @ApiProperty({ example: 'PIPC' })
  boardCode: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '' })
  description: string | null;

  @ApiProperty({ enum: BoardType, example: BoardType.PUBLIC })
  type: BoardType;

  @ApiProperty({ type: [BoardMemberResponseDto] })
  members: BoardMemberResponseDto[];

  @ApiProperty({ type: [BoardColumnResponseDto] })
  columns: BoardColumnResponseDto[];

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  updatedAt: Date;
}

export class BoardUserResponseDto {
  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ enum: BoardMemberRole, example: BoardMemberRole.ADMIN })
  role: BoardMemberRole;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'user' })
  username: string;

  @ApiProperty({ example: 'User' })
  displayName: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  avatar: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'U-000042',
    description:
      'Mã người dùng công khai, dùng để tìm thành viên mà không cần email. Null với user tạo trước khi tính năng này có.',
  })
  userCode: string | null;

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '2026-05-25T00:00:00.000Z',
  })
  updatedAt: Date | null;
}

export class BoardUsersResponseDto {
  @ApiProperty({ example: 1 })
  total: number;

  @ApiProperty({ type: [BoardUserResponseDto] })
  items: BoardUserResponseDto[];
}
