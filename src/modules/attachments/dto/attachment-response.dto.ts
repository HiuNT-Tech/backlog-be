import { ApiProperty } from '@nestjs/swagger';

export class AttachmentResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'screenshot.png' })
  fileName: string;

  @ApiProperty({ example: 'http://localhost:8017/uploads/uuid.png' })
  fileUrl: string;

  @ApiProperty({ example: 'image/png' })
  mimeType: string;

  @ApiProperty({ example: 20480 })
  fileSize: number;
}
