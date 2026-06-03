import { Type } from 'class-transformer';
import { StatusColor } from '@common/types';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class ListIssueTypesQueryDto {
  @ApiPropertyOptional({ example: 'bug' })
  @IsOptional()
  @IsString()
  keyword?: string;

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

export class CreateIssueTypeDto {
  @ApiProperty({ example: 'Bug', minLength: 3, maxLength: 50 })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ enum: StatusColor, example: StatusColor.BLUE, default: StatusColor.BLUE })
  @IsOptional()
  @IsEnum(StatusColor)
  statusColor: StatusColor = StatusColor.BLUE;
}

export class UpdateIssueTypeDto extends PartialType(CreateIssueTypeDto) {}
