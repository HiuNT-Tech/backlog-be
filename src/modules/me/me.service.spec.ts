import { mock, MockProxy } from 'jest-mock-extended';
import { UsersService } from '@modules/users/users.service';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { MeService } from './me.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { makeJwtPayload } from '../../../test/factories/jwt-payload.factory';

describe('MeService', () => {
  let service: MeService;
  let usersService: MockProxy<UsersService>;

  beforeEach(() => {
    usersService = mock<UsersService>();
    service = new MeService(usersService);
  });

  describe('getProfile', () => {
    it('should call usersService.findOne with the user id from the token and return its result unchanged', async () => {
      const user = makeJwtPayload({ userId: 42 });
      const response = { id: 42, email: 'user@example.com' } as UserResponseDto;
      usersService.findOne.mockResolvedValue(response);

      const result = await service.getProfile(user);

      expect(usersService.findOne).toHaveBeenCalledWith(42);
      expect(result).toBe(response);
    });
  });

  describe('updateProfile', () => {
    it('should call usersService.updateProfile with the user id and dto and return its result unchanged', async () => {
      const user = makeJwtPayload({ userId: 7 });
      const dto: UpdateProfileDto = {
        displayName: 'John Doe',
        avatar: 'https://example.com/avatar.png',
        phone: '0901234567',
      };
      const response = { id: 7, displayName: 'John Doe' } as UserResponseDto;
      usersService.updateProfile.mockResolvedValue(response);

      const result = await service.updateProfile(user, dto);

      expect(usersService.updateProfile).toHaveBeenCalledWith(7, dto);
      expect(result).toBe(response);
    });
  });

  describe('changePassword', () => {
    it('should call usersService.changePassword with the user id, currentPassword and newPassword in the correct order', async () => {
      const user = makeJwtPayload({ userId: 13 });
      const dto: ChangePasswordDto = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      };
      usersService.changePassword.mockResolvedValue(undefined);

      const result = await service.changePassword(user, dto);

      expect(usersService.changePassword).toHaveBeenCalledWith(
        13,
        'oldPassword123',
        'newPassword123',
      );
      expect(result).toBeUndefined();
    });
  });
});
