import { mock, MockProxy } from 'jest-mock-extended';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';
import { Role } from '@common/enums/role.enum';
import * as cryptoUtil from '@common/utils/crypto.util';
import { UsersService } from './users.service';
import { UsersRepository } from './repositories/users.repository';
import { UserResponseDto } from './dto/user-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { makeUserEntity } from '../../../test/factories/user.factory';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: MockProxy<UsersRepository>;

  beforeEach(() => {
    usersRepository = mock<UsersRepository>();
    service = new UsersService(usersRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('should hash the password, create the user via createForRegistration and return a response dto', async () => {
      const dto: CreateUserDto = {
        email: 'new@example.com',
        displayName: 'New User',
        password: 'plain-password',
        phone: '0123456789',
      };
      const createdUser = makeUserEntity({ email: dto.email });
      jest
        .spyOn(cryptoUtil, 'hashPassword')
        .mockResolvedValue('hashed-password');
      jest
        .spyOn(cryptoUtil, 'generateRandomToken')
        .mockReturnValue('random-token');
      usersRepository.createUser.mockResolvedValue(createdUser);

      const result = await service.create(dto);

      expect(cryptoUtil.hashPassword).toHaveBeenCalledWith(dto.password);
      expect(usersRepository.createUser).toHaveBeenCalledWith({
        email: dto.email,
        displayName: dto.displayName,
        password: 'hashed-password',
        phone: dto.phone,
        role: Role.USER,
        verifyToken: 'random-token',
      });
      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('createForRegistration', () => {
    it('should create a user entity with hashed password, USER role and a generated verify token', async () => {
      const dto: CreateUserDto = {
        email: 'register@example.com',
        password: 'plain-password',
      };
      const createdUser = makeUserEntity({ email: dto.email });
      jest
        .spyOn(cryptoUtil, 'hashPassword')
        .mockResolvedValue('hashed-password');
      jest
        .spyOn(cryptoUtil, 'generateRandomToken')
        .mockReturnValue('random-token');
      usersRepository.createUser.mockResolvedValue(createdUser);

      const result = await service.createForRegistration(dto);

      expect(usersRepository.createUser).toHaveBeenCalledWith({
        email: dto.email,
        displayName: undefined,
        password: 'hashed-password',
        phone: undefined,
        role: Role.USER,
        verifyToken: 'random-token',
      });
      expect(result).toBe(createdUser);
    });
  });

  describe('findAll', () => {
    it('should normalize sortBy and map paginated repository result to response dtos', async () => {
      const users = [
        makeUserEntity({ id: 1 }),
        makeUserEntity({ id: 2 }),
      ];
      usersRepository.findPaginatedUsers.mockResolvedValue({
        items: users,
        total: 2,
      });

      const result = await service.findAll({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(usersRepository.findPaginatedUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toBeInstanceOf(UserResponseDto);
    });

    it('should fall back sortBy to createdAt when the field is not allow-listed', async () => {
      usersRepository.findPaginatedUsers.mockResolvedValue({
        items: [],
        total: 0,
      });

      await service.findAll({
        page: 1,
        limit: 10,
        sortBy: 'password',
        sortOrder: 'asc',
      });

      expect(usersRepository.findPaginatedUsers).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'createdAt' }),
      );
    });
  });

  describe('findOne', () => {
    it('should return the response dto when the user is found and active', async () => {
      const user = makeUserEntity({ id: 5 });
      usersRepository.findActiveById.mockResolvedValue(user);

      const result = await service.findOne(5);

      expect(usersRepository.findActiveById).toHaveBeenCalledWith(5);
      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result.id).toBe(5);
    });

    it('should throw USER_NOT_FOUND 404 when the user does not exist', async () => {
      usersRepository.findActiveById.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.USER_NOT_FOUND },
      });
    });
  });

  describe('findByEmail', () => {
    it('should normalize the email before delegating to the repository', async () => {
      const user = makeUserEntity({ email: 'user@example.com' });
      usersRepository.findByEmail.mockResolvedValue(user);

      const result = await service.findByEmail('  USER@Example.com ');

      expect(usersRepository.findByEmail).toHaveBeenCalledWith(
        'user@example.com',
      );
      expect(result).toBe(user);
    });

    it('should return null when no user matches the email', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('missing@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByIdForAuth', () => {
    it('should delegate to usersRepository.findById', async () => {
      const user = makeUserEntity({ id: 7 });
      usersRepository.findById.mockResolvedValue(user);

      const result = await service.findByIdForAuth(7);

      expect(usersRepository.findById).toHaveBeenCalledWith(7);
      expect(result).toBe(user);
    });

    it('should return null when the repository finds nothing', async () => {
      usersRepository.findById.mockResolvedValue(null);

      const result = await service.findByIdForAuth(404);

      expect(result).toBeNull();
    });
  });

  describe('verifyAccount', () => {
    it('should return a response dto when verification succeeds', async () => {
      const user = makeUserEntity({ id: 1, isActive: true, verifyToken: null });
      usersRepository.verifyAccount.mockResolvedValue(user);

      const result = await service.verifyAccount(1, 'valid-token');

      expect(usersRepository.verifyAccount).toHaveBeenCalledWith(
        1,
        'valid-token',
      );
      expect(result).toBeInstanceOf(UserResponseDto);
    });

    it('should throw USER_NOT_FOUND 404 when the repository returns null', async () => {
      usersRepository.verifyAccount.mockResolvedValue(null);

      await expect(
        service.verifyAccount(1, 'invalid-token'),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.USER_NOT_FOUND },
      });
    });
  });

  describe('update', () => {
    const dto: UpdateUserDto = {
      displayName: 'Updated Name',
      phone: '0999999999',
      isActive: false,
    };

    it('should verify the user exists, update it and return a response dto', async () => {
      const existing = makeUserEntity({ id: 3 });
      const updated = makeUserEntity({ id: 3, displayName: 'Updated Name' });
      usersRepository.findActiveById.mockResolvedValue(existing);
      usersRepository.updateUser.mockResolvedValue(updated);

      const result = await service.update(3, dto);

      expect(usersRepository.findActiveById).toHaveBeenCalledWith(3);
      expect(usersRepository.updateUser).toHaveBeenCalledWith(3, {
        displayName: dto.displayName,
        phone: dto.phone,
        isActive: dto.isActive,
      });
      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result.displayName).toBe('Updated Name');
    });

    it('should throw USER_NOT_FOUND 404 when the user does not exist prior to updating', async () => {
      usersRepository.findActiveById.mockResolvedValue(null);

      await expect(service.update(999, dto)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.USER_NOT_FOUND },
      });
      expect(usersRepository.updateUser).not.toHaveBeenCalled();
    });

    it('should throw USER_NOT_FOUND 404 when updateUser unexpectedly returns null', async () => {
      const existing = makeUserEntity({ id: 3 });
      usersRepository.findActiveById.mockResolvedValue(existing);
      usersRepository.updateUser.mockResolvedValue(null);

      await expect(service.update(3, dto)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.USER_NOT_FOUND },
      });
    });
  });

  describe('remove', () => {
    it('should verify the user exists, soft delete it and return a response dto', async () => {
      const existing = makeUserEntity({ id: 4 });
      const removed = makeUserEntity({ id: 4, isActive: false });
      usersRepository.findActiveById.mockResolvedValue(existing);
      usersRepository.softDelete.mockResolvedValue(removed);

      const result = await service.remove(4);

      expect(usersRepository.findActiveById).toHaveBeenCalledWith(4);
      expect(usersRepository.softDelete).toHaveBeenCalledWith(4);
      expect(result).toBeInstanceOf(UserResponseDto);
    });

    it('should throw USER_NOT_FOUND 404 when the user does not exist prior to removal', async () => {
      usersRepository.findActiveById.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.USER_NOT_FOUND },
      });
      expect(usersRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw USER_NOT_FOUND 404 when softDelete unexpectedly returns null', async () => {
      const existing = makeUserEntity({ id: 4 });
      usersRepository.findActiveById.mockResolvedValue(existing);
      usersRepository.softDelete.mockResolvedValue(null);

      await expect(service.remove(4)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.USER_NOT_FOUND },
      });
    });
  });

  describe('updateProfile', () => {
    it('should update the profile and return a response dto', async () => {
      const data = { displayName: 'Profile Name', avatar: 'avatar.png' };
      const updated = makeUserEntity({ id: 6, displayName: 'Profile Name' });
      usersRepository.updateProfile.mockResolvedValue(updated);

      const result = await service.updateProfile(6, data);

      expect(usersRepository.updateProfile).toHaveBeenCalledWith(6, data);
      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result.displayName).toBe('Profile Name');
    });

    it('should throw USER_NOT_FOUND 404 when the repository returns null', async () => {
      usersRepository.updateProfile.mockResolvedValue(null);

      await expect(
        service.updateProfile(999, { displayName: 'X' }),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.USER_NOT_FOUND },
      });
    });
  });

  describe('changePassword', () => {
    it('should throw USER_NOT_FOUND 404 when the active user cannot be found', async () => {
      usersRepository.findActiveById.mockResolvedValue(null);
      const compareSpy = jest.spyOn(cryptoUtil, 'comparePassword');

      await expect(
        service.changePassword(1, 'current', 'new-password'),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.USER_NOT_FOUND },
      });
      expect(compareSpy).not.toHaveBeenCalled();
      expect(usersRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw INVALID_CURRENT_PASSWORD 400 when the current password does not match', async () => {
      const user = makeUserEntity({ id: 1, password: 'hashed-current' });
      usersRepository.findActiveById.mockResolvedValue(user);
      jest.spyOn(cryptoUtil, 'comparePassword').mockResolvedValue(false);

      await expect(
        service.changePassword(1, 'wrong-current', 'new-password'),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: { errorCode: ErrorCode.INVALID_CURRENT_PASSWORD },
      });
      expect(usersRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('should hash the new password and update it when the current password matches', async () => {
      const user = makeUserEntity({ id: 1, password: 'hashed-current' });
      usersRepository.findActiveById.mockResolvedValue(user);
      jest.spyOn(cryptoUtil, 'comparePassword').mockResolvedValue(true);
      jest
        .spyOn(cryptoUtil, 'hashPassword')
        .mockResolvedValue('hashed-new-password');

      await service.changePassword(1, 'current-password', 'new-password');

      expect(cryptoUtil.comparePassword).toHaveBeenCalledWith(
        'current-password',
        'hashed-current',
      );
      expect(cryptoUtil.hashPassword).toHaveBeenCalledWith('new-password');
      expect(usersRepository.updatePassword).toHaveBeenCalledWith(
        1,
        'hashed-new-password',
      );
    });
  });

  describe('setResetPasswordToken', () => {
    it('should delegate to the repository with the given id, token and expiry', async () => {
      const expiresAt = new Date('2026-01-01T00:00:00Z');
      usersRepository.setResetPasswordToken.mockResolvedValue(undefined);

      await service.setResetPasswordToken(1, 'reset-token', expiresAt);

      expect(usersRepository.setResetPasswordToken).toHaveBeenCalledWith(
        1,
        'reset-token',
        expiresAt,
      );
    });
  });

  describe('resetPassword', () => {
    it('should hash the new password and delegate to the repository', async () => {
      jest
        .spyOn(cryptoUtil, 'hashPassword')
        .mockResolvedValue('hashed-reset-password');
      usersRepository.resetPassword.mockResolvedValue(undefined);

      await service.resetPassword(1, 'new-password');

      expect(cryptoUtil.hashPassword).toHaveBeenCalledWith('new-password');
      expect(usersRepository.resetPassword).toHaveBeenCalledWith(
        1,
        'hashed-reset-password',
      );
    });
  });
});
