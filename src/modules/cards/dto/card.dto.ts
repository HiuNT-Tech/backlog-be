import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const toNumberArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const values = Array.isArray(value) ? value : String(value).split(',');
  return values.map((item) => Number(item));
};

const toStringArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const values = Array.isArray(value) ? value : String(value).split(',');
  return values.map((item) => String(item).trim());
};

export class CreateCardDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  boardId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  columnId: number;

  @ApiProperty({ example: 'Issue title', minLength: 3, maxLength: 50 })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  title: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 2, description: 'Priority: 1=LOW, 2=MEDIUM, 3=HIGH' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priority?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assigneeUserId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  issueTypeId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  versionId?: number;

  @ApiPropertyOptional({ example: '2026-05-25' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-05-30' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: '4.5' })
  @IsOptional()
  @Matches(/^[0-9]+([.,][0-9]*)?$/, {
    message: 'Must be a valid number (e.g. 0.0)',
  })
  @MaxLength(32)
  estimatedHours?: string;

  @ApiPropertyOptional({ example: '2.5' })
  @IsOptional()
  @Matches(/^[0-9]+([.,][0-9]*)?$/, {
    message: 'Must be a valid number (e.g. 0.0)',
  })
  @MaxLength(32)
  actualHours?: string;
}

export class UpdateCardDto {
  @ApiPropertyOptional({ example: 'New title', minLength: 3, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  title?: string;

  @ApiPropertyOptional({ example: 'New desc' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  columnId?: number;

  @ApiPropertyOptional({ example: 3, description: 'Priority: 1=LOW, 2=MEDIUM, 3=HIGH' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priority?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assigneeUserId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  issueTypeId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  versionId?: number;

  @ApiPropertyOptional({ example: '2026-05-25' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-05-30' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: '5.5' })
  @IsOptional()
  @Matches(/^[0-9]+([.,][0-9]*)?$/, {
    message: 'Must be a valid number (e.g. 0.0)',
  })
  @MaxLength(32)
  estimatedHours?: string;

  @ApiPropertyOptional({ example: '3.5' })
  @IsOptional()
  @Matches(/^[0-9]+([.,][0-9]*)?$/, {
    message: 'Must be a valid number (e.g. 0.0)',
  })
  @MaxLength(32)
  actualHours?: string;
}

export class ListBoardCardsQueryDto {
  @ApiPropertyOptional({ example: 'Issue title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'PIPC-4119' })
  @IsOptional()
  @IsString()
  cardCode?: string;

  @ApiPropertyOptional({ example: '1,3', description: 'Priority: 1=LOW, 2=MEDIUM, 3=HIGH' })
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  priority?: number[];

  @ApiPropertyOptional({ example: '1,2' })
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  issueTypeId?: number[];

  @ApiPropertyOptional({ example: '1,2' })
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  columnId?: number[];

  @ApiPropertyOptional({ example: '1,2' })
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  assigneeUserId?: number[];

  @ApiPropertyOptional({ example: '1,2' })
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  registeredByUserId?: number[];

  @ApiPropertyOptional({ example: '1,2' })
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  versionId?: number[];

  @ApiPropertyOptional({ example: '2026-05-25' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-05-30' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip = 0;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 10;
}

export class MoveCardItemDto {
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

export class MoveCardDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currentCardId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  prevColumnId: number;

  @ApiProperty({ type: [MoveCardItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MoveCardItemDto)
  prevCards: MoveCardItemDto[];

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nextColumnId: number;

  @ApiProperty({ type: [MoveCardItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MoveCardItemDto)
  nextCards: MoveCardItemDto[];
}
