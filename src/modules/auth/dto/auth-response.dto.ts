import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'User' })
  displayName: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  avatar: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  userCode: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-05-26T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-05-26T00:00:00.000Z' })
  updatedAt: string;
}

export class LoginResponseDto extends AuthUserResponseDto {
  @ApiProperty({ example: '<jwt>' })
  accessToken: string;

  @ApiProperty({ example: '<jwt>' })
  refreshToken: string;
}

export class RefreshTokenResponseDto {
  @ApiProperty({ example: '<jwt>' })
  accessToken: string;

  @ApiProperty({ example: '<jwt>' })
  refreshToken: string;
}

export class LogoutResponseDto {
  @ApiProperty({ example: 'Logged out successfully' })
  message: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Done' })
  message: string;
}
