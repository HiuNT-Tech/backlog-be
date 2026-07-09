import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusColor } from '@common/types';
import { AttachmentResponseDto } from '@modules/attachments/dto/attachment-response.dto';

export class CardUserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'User Name' })
  displayName: string;

  @ApiPropertyOptional({ example: null })
  avatar?: string | null;
}

export class CardColumnResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  boardId: number;

  @ApiProperty({ example: 'To Do' })
  title: string;

  @ApiProperty({ example: 7 })
  statusColor: StatusColor;

  @ApiProperty({ example: 0 })
  position: number;
}

export class CardIssueTypeResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  boardId: number;

  @ApiProperty({ example: 'Bug' })
  name: string;

  @ApiProperty({ example: 1 })
  statusColor: StatusColor;
}

export class CardVersionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  boardId: number;

  @ApiProperty({ example: 'v1.0' })
  name: string;
}

export class CardResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  boardId: number;

  @ApiProperty({ example: 1 })
  columnId: number;

  @ApiProperty({ example: 4119 })
  cardNumber: number;

  @ApiProperty({ example: 'PIPC-4119' })
  cardCode: string;

  @ApiProperty({ example: 'Issue title' })
  title: string;

  @ApiPropertyOptional({ example: '' })
  description?: string | null;

  @ApiPropertyOptional({ example: 2, description: 'Priority: 1=LOW, 2=MEDIUM, 3=HIGH' })
  priority?: number | null;

  @ApiPropertyOptional({ example: 1 })
  assigneeUserId?: number | null;

  @ApiPropertyOptional({ type: CardUserResponseDto })
  assignee?: CardUserResponseDto | null;

  @ApiPropertyOptional({ example: 1 })
  issueTypeId?: number | null;

  @ApiPropertyOptional({ type: CardIssueTypeResponseDto })
  issueType?: CardIssueTypeResponseDto | null;

  @ApiPropertyOptional({ type: CardColumnResponseDto })
  column?: CardColumnResponseDto;

  @ApiPropertyOptional({ example: 1 })
  versionId?: number | null;

  @ApiPropertyOptional({ type: CardVersionResponseDto })
  version?: CardVersionResponseDto | null;

  @ApiPropertyOptional({ example: '2026-05-25T00:00:00.000Z' })
  startDate?: Date | null;

  @ApiPropertyOptional({ example: '2026-05-30T00:00:00.000Z' })
  dueDate?: Date | null;

  @ApiPropertyOptional({ example: '4' })
  estimatedHours?: string | null;

  @ApiPropertyOptional({ example: '2' })
  actualHours?: string | null;

  @ApiPropertyOptional({ type: CardUserResponseDto })
  registeredBy?: CardUserResponseDto | null;

  @ApiPropertyOptional({ example: 1 })
  registeredByUserId?: number | null;

  @ApiPropertyOptional({ type: CardUserResponseDto })
  createdBy?: CardUserResponseDto | null;

  @ApiProperty({ example: 0 })
  position: number;

  @ApiProperty({ type: [AttachmentResponseDto] })
  attachments: AttachmentResponseDto[];

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  updatedAt: Date;
}

export class BoardCardsResponseDto {
  @ApiProperty({ example: 0 })
  total: number;

  @ApiProperty({ type: [CardResponseDto] })
  items: CardResponseDto[];
}

export class MoveCardResponseDto {
  @ApiProperty({ example: 'Successfully!' })
  updateResult: string;
}
