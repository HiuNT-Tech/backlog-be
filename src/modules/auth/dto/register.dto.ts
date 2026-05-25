import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { normalizeEmail, normalizeString } from '@common/utils/string.util';

export class RegisterDto {
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  email: string;

  @IsString()
  @MinLength(2)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeString(value) : value,
  )
  @IsOptional()
  displayName?: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
