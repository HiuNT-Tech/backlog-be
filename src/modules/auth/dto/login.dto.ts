import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { normalizeEmail } from '@common/utils/string.util';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  email: string;

  @ApiProperty({ minLength: 8, example: 'password123' })
  @IsString()
  @MinLength(8)
  password: string;
}
