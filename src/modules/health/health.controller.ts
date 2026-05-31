import { Controller, Get } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { ApiErrorResponseDto } from '@common/dto/response.dto';
import { HealthService, HealthStatus } from './health.service';

class HealthServicesResponseDto {
  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  postgres: 'up' | 'down';

  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  redis: 'up' | 'down';
}

class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'error'], example: 'ok' })
  status: 'ok' | 'error';

  @ApiProperty({ example: '2026-05-31T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: 123.45 })
  uptime: number;

  @ApiProperty({ type: HealthServicesResponseDto })
  services: HealthServicesResponseDto;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({
    summary: 'Health check',
    description: 'Return API health and dependency status for Postgres/Redis.',
  })
  @ApiOkResponse({
    description: 'Health check completed.',
    type: HealthResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Health check failed unexpectedly.',
    type: ApiErrorResponseDto,
  })
  @Public()
  @Get()
  check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}
