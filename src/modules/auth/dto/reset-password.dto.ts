import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { normalizeEmail } from '@common/utils/string.util';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  email: string;

  @ApiProperty({ example: 'reset-token' })
  @IsString()
  token: string;

  @ApiProperty({ minLength: 8, example: 'newPassword123' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
