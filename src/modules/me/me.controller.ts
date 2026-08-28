import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
  UploadedFile as UploadedFileParam,
} from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@/types/jwt-payload.type';
import {
  createUploadedFilePipe,
  IMAGE_MIME_TYPES,
  UploadedFile,
  UseSingleFileUpload,
} from '@common/upload';
import {
  ApiMeControllerDocs,
  ApiGetProfileDocs,
  ApiUpdateProfileDocs,
  ApiChangePasswordDocs,
  ApiUploadAvatarDocs,
} from './decorators/me-swagger.decorator';
import { MeService } from './me.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const avatarUploadOptions = {
  fieldName: 'avatar',
  required: true,
  allowedMimeTypes: IMAGE_MIME_TYPES,
};

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

  @ApiUploadAvatarDocs()
  @Post('avatar')
  @UseSingleFileUpload(avatarUploadOptions)
  uploadAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFileParam(createUploadedFilePipe(avatarUploadOptions))
    file: UploadedFile,
  ) {
    return this.meService.uploadAvatar(user, file);
  }
}
