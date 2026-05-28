import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VersionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  boardId: number;

  @ApiProperty({ example: 'v1.0' })
  name: string;

  @ApiPropertyOptional({ example: '2026-05-25T00:00:00.000Z' })
  startDate?: Date | null;

  @ApiPropertyOptional({ example: '2026-05-30T00:00:00.000Z' })
  endDate?: Date | null;

  @ApiProperty({ example: '' })
  description: string;

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  updatedAt: Date;
}

export class VersionsResponseDto {
  @ApiProperty({ type: [VersionResponseDto] })
  items: VersionResponseDto[];

  @ApiProperty({ example: 1 })
  count: number;
}

export class DeleteVersionResponseDto {
  @ApiProperty({ example: 'Version deleted successfully!' })
  deleteResult: string;
}
