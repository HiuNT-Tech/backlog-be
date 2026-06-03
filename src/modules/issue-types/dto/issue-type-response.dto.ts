import { ApiProperty } from '@nestjs/swagger';
import { StatusColor } from '@common/types';

export class IssueTypeResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  boardId: number;

  @ApiProperty({ example: 'Bug' })
  name: string;

  @ApiProperty({ example: 1 })
  statusColor: StatusColor;

  @ApiProperty({ example: 2 })
  issueCount: number;

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  updatedAt: Date;
}

export class IssueTypesResponseDto {
  @ApiProperty({ type: [IssueTypeResponseDto] })
  items: IssueTypeResponseDto[];

  @ApiProperty({ example: 1 })
  count: number;
}

export class DeleteIssueTypeResponseDto {
  @ApiProperty({ example: 'Issue type deleted successfully!' })
  deleteResult: string;
}
