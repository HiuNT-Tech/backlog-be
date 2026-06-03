import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { BoardMemberRole, BoardType } from '@prisma/client';
import { normalizeString } from '@common/utils/string.util';

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return normalizeString(value);
};

export class ReorderColumnDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;

  @ApiProperty({ example: 0, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position: number;
}

export class CreateBoardDto {
  @ApiProperty({
    example: 'Pro IP Partner Customer',
    minLength: 3,
    maxLength: 50,
  })
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  title: string;

  @ApiProperty({
    example: 'PIPC',
    minLength: 2,
    maxLength: 16,
    description:
      'Project key used to build card codes. Uppercase letters, numbers, and underscores only.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(16)
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'boardCode must contain only uppercase letters, numbers, underscores, and hyphens',
  })
  boardCode: string;

  @ApiPropertyOptional({ example: '', maxLength: 255 })
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ enum: BoardType, example: BoardType.PUBLIC })
  @IsEnum(BoardType)
  type: BoardType;
}

export class UpdateBoardDto extends PartialType(CreateBoardDto) {
  @ApiPropertyOptional({ type: [ReorderColumnDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ReorderColumnDto)
  columns?: ReorderColumnDto[];
}

export class GetBoardDetailQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assigneeUserId?: number;
}

export class GetBoardUsersQueryDto {
  @ApiPropertyOptional({ example: 'admin' })
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: BoardMemberRole,
    example: BoardMemberRole.ADMIN,
  })
  @IsOptional()
  @IsEnum(BoardMemberRole)
  role?: BoardMemberRole;

  @ApiPropertyOptional({ example: 0, minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip = 0;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;
}
