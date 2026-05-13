import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { normalizeString } from '@common/utils/string.util';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeString(value).toUpperCase() : value,
  )
  sku: string;

  @IsString()
  @MinLength(2)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeString(value) : value,
  )
  name: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeString(value) : value,
  )
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceCents: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
