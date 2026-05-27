import { Transform } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { normalizeEmail } from '@common/utils/string.util';

export class VerifyAccountDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  email: string;

  @ApiProperty({ example: 'verification-token' })
  @IsString()
  token: string;
}
