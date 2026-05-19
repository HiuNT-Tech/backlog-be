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
}
