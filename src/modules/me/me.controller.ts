import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@/types/jwt-payload.type';
import {
  ApiMeControllerDocs,
  ApiGetProfileDocs,
  ApiUpdateProfileDocs,
  ApiChangePasswordDocs,
} from './decorators/me-swagger.decorator';
import { MeService } from './me.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiMeControllerDocs()
@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @ApiGetProfileDocs()
  @Get()
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.meService.getProfile(user);
  }

  @ApiUpdateProfileDocs()
  @Patch()
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.meService.updateProfile(user, dto);
  }

  @ApiChangePasswordDocs()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put('password')
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.meService.changePassword(user, dto);
  }
}
