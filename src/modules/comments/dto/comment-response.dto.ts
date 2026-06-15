import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommentUserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'User Name' })
  displayName: string;

  @ApiPropertyOptional({ example: null })
  avatar?: string | null;
}

export class CommentResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  cardId: number;

  @ApiProperty({ example: 'This is a comment' })
  content: string;

  @ApiProperty({ type: CommentUserResponseDto })
  user: CommentUserResponseDto;

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  updatedAt: Date;
}

export class CommentListResponseDto {
  @ApiProperty({ example: 0 })
  total: number;

  @ApiProperty({ type: [CommentResponseDto] })
  items: CommentResponseDto[];
}

export class DeleteCommentResponseDto {
  @ApiProperty({ example: 'Successfully!' })
  deleteResult: string;
}
