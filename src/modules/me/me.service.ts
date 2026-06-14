import { Injectable } from '@nestjs/common';
import { JwtPayload } from '@/types/jwt-payload.type';
import { UsersService } from '@modules/users/users.service';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class MeService {
  constructor(private readonly usersService: UsersService) {}

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
}
