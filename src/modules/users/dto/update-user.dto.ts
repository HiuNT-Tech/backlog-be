import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { normalizeString } from '@common/utils/string.util';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeString(value) : value,
  )
  displayName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
