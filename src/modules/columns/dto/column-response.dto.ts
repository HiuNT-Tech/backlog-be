import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ColumnCardCountDto {
  @ApiProperty({ example: 3 })
  cards: number;
}

export class ColumnResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  boardId: number;

  @ApiProperty({ example: 'To Do' })
  title: string;

  @ApiProperty({ example: 7 })
  statusColor: number;

  @ApiProperty({ example: 0 })
  position: number;

  @ApiPropertyOptional({ type: ColumnCardCountDto })
  _count?: ColumnCardCountDto;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  cards?: unknown[];

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  updatedAt: Date;
}

export class DeleteColumnResponseDto {
  @ApiProperty({ example: 'Column and its Cards deleted successfully!' })
  deleteResult: string;
}
