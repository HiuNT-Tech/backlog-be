import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { toIntArrayTransform } from '@modules/attachments/attachments.utils';

export class CreateCommentDto {
  @ApiPropertyOptional({
    example: 'This is a comment',
    maxLength: 5000,
    description: 'Nội dung comment. Có thể bỏ trống nếu có file đính kèm.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;
}

export class UpdateCommentDto {
  @ApiPropertyOptional({ example: 'Updated comment', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({
    type: [Number],
    example: [1, 2],
    description: 'ID các attachment cần gỡ khỏi comment.',
  })
  @IsOptional()
  @Transform(toIntArrayTransform)
  @IsArray()
  @IsInt({ each: true })
  removeAttachmentIds?: number[];
}

export class ListCommentsQueryDto {
  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip = 0;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 20;
}
