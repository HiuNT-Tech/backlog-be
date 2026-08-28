import { mock, MockProxy } from 'jest-mock-extended';
import { UsersService } from '@modules/users/users.service';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { UploadedFile } from '@common/upload';
import { StorageService } from '@shared/storage/storage.service';
import { MeService } from './me.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { makeJwtPayload } from '../../../test/factories/jwt-payload.factory';

describe('MeService', () => {
  let service: MeService;
  let usersService: MockProxy<UsersService>;
  let storageService: MockProxy<StorageService>;

  beforeEach(() => {
    usersService = mock<UsersService>();
    storageService = mock<StorageService>();
    service = new MeService(usersService, storageService);
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

  describe('uploadAvatar', () => {
    it('should upload the file to storage then update the user avatar with the resulting url', async () => {
      const user = makeJwtPayload({ userId: 7 });
      const file = {
        originalname: 'avatar.png',
        mimetype: 'image/png',
        buffer: Buffer.from('fake-image'),
      } as UploadedFile;
      storageService.upload.mockResolvedValue({
        key: 'avatar-key.png',
        url: 'https://storage.example.com/avatar-key.png',
      });
      const response = {
        id: 7,
        avatar: 'https://storage.example.com/avatar-key.png',
      } as UserResponseDto;
      usersService.updateProfile.mockResolvedValue(response);

      const result = await service.uploadAvatar(user, file);

      expect(storageService.upload).toHaveBeenCalledWith({
        filename: 'avatar.png',
        mimeType: 'image/png',
        buffer: file.buffer,
      });
      expect(usersService.updateProfile).toHaveBeenCalledWith(7, {
        avatar: 'https://storage.example.com/avatar-key.png',
      });
      expect(result).toBe(response);
    });
  });
});
