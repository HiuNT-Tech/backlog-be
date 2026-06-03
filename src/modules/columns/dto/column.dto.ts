import { Type } from 'class-transformer';
import { StatusColor } from '@common/types';
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
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ListColumnsQueryDto {

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class CreateColumnDto {

  @ApiProperty({ example: 'Review', minLength: 2, maxLength: 50 })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  title: string;

  @ApiProperty({ enum: StatusColor, example: StatusColor.BLUE })
  @IsEnum(StatusColor)
  statusColor: StatusColor;
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

  @ApiPropertyOptional({ enum: StatusColor, example: StatusColor.BLUE })
  @IsOptional()
  @IsEnum(StatusColor)
  statusColor?: StatusColor;

  @ApiPropertyOptional({ type: [ReorderCardDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ReorderCardDto)
  cards?: ReorderCardDto[];
}
