import { Controller, Get } from '@nestjs/common';
import { Public } from '@common/decorators/public.decorator';

type ApiInfo = {
  status: 'ok';
};

@Controller()
export class AppController {
  @Public()
  @Get()
  getInfo(): ApiInfo {
    return {
      status: 'ok',
    };
  }

  @Public()
  @Get('status')
  getStatus() {
    return { message: 'APIs V1 are ready to use.' };
  }
}
