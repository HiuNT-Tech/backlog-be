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

class ApiInfoResponseDto {
  @ApiProperty({ example: 'ok' })
  status: 'ok';
}

class ApiStatusResponseDto {
  @ApiProperty({ example: 'APIs V1 are ready to use.' })
  message: string;
}

type ApiInfo = {
  status: 'ok';
};

@ApiTags('status')
@Controller()
export class AppController {
  @ApiOperation({
    summary: 'API info',
    description: 'Return a minimal API reachability payload.',
  })
  @ApiOkResponse({
    description: 'API process is reachable.',
    type: ApiInfoResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'API process has an unexpected error.',
    type: ApiErrorResponseDto,
  })
  @Public()
  @Get()
  getInfo(): ApiInfo {
    return {
      status: 'ok',
    };
  }

  @ApiOperation({
    summary: 'API status',
    description: 'Smoke-test endpoint for FE/dev tooling.',
  })
  @ApiOkResponse({
    description: 'API v1 process is reachable.',
    type: ApiStatusResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'API process has an unexpected error.',
    type: ApiErrorResponseDto,
  })
  @Public()
  @Get('status')
  getStatus() {
    return { message: 'APIs V1 are ready to use.' };
  }
}
