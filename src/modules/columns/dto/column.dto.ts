import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ListColumnsQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  boardId: number;
}

export class CreateColumnDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  boardId: number;

  @ApiProperty({ example: 'Review', minLength: 2, maxLength: 50 })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  title: string;

  @ApiProperty({ example: 7, minimum: 1, maximum: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  statusColor: number;
}

export class ReorderCardDto {
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

export class UpdateColumnDto {
  @ApiPropertyOptional({ example: 'Done', minLength: 2, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  title?: string;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  statusColor?: number;

  @ApiPropertyOptional({ type: [ReorderCardDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ReorderCardDto)
  cards?: ReorderCardDto[];
}
