import { Injectable } from '@nestjs/common';
import { JwtPayload } from '@/types/jwt-payload.type';
import { UploadedFile } from '@common/upload';
import { StorageService } from '@shared/storage/storage.service';
import { UsersService } from '@modules/users/users.service';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class MeService {
  constructor(
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
  ) {}

  getProfile(user: JwtPayload): Promise<UserResponseDto> {
    return this.usersService.findOne(user.userId);
  }

  updateProfile(
    user: JwtPayload,
    dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfile(user.userId, dto);
  }

  changePassword(user: JwtPayload, dto: ChangePasswordDto): Promise<void> {
    return this.usersService.changePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  async uploadAvatar(
    user: JwtPayload,
    file: UploadedFile,
  ): Promise<UserResponseDto> {
    const { url } = await this.storageService.upload({
      filename: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer!,
    });

    return this.usersService.updateProfile(user.userId, { avatar: url });
  }
}
