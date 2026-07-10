import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommentType } from '@prisma/client';
import { AttachmentResponseDto } from '@modules/attachments/dto/attachment-response.dto';

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

  @ApiProperty({
    enum: CommentType,
    example: CommentType.USER,
    description:
      'USER: comment do người dùng viết. SYSTEM: comment tự sinh khi ticket được cập nhật, content là delta JSON của jsondiffpatch.',
  })
  type: CommentType;

  @ApiProperty({ type: CommentUserResponseDto })
  user: CommentUserResponseDto;

  @ApiProperty({ type: [AttachmentResponseDto] })
  attachments: AttachmentResponseDto[];

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
