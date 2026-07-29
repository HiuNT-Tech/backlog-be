import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '@database/prisma/prisma.service';
import { buildUserCode } from '@common/utils/user-code.util';
import { UsersRepository } from './users.repository';
import { UserEntity } from '../entities/user.entity';
import { makeUserEntity } from '../../../../test/factories/user.factory';

// Raw Prisma rows already use camelCase field names (Prisma maps snake_case
// db columns to camelCase JS fields via @map), so a raw row has the exact
// same shape as UserEntity - toEntity() is a 1:1 field copy.
const makeRawRow = (over: Partial<UserEntity> = {}) => makeUserEntity(over);

describe('UsersRepository', () => {
  let prisma: DeepMockProxy<PrismaService>;
  let repository: UsersRepository;

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    repository = new UsersRepository(prisma);
  });

  describe('findPaginatedUsers', () => {
    it('should query only active, non-deleted users, ordered by the given field, and map rows to entities', async () => {
      const rows = [makeRawRow({ id: 1 }), makeRawRow({ id: 2 })];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(rows);
      (prisma.user.count as jest.Mock).mockResolvedValue(2);

      const result = await repository.findPaginatedUsers({
        page: 2,
        limit: 5,
        sortBy: 'email',
        sortOrder: 'asc',
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { isActive: true, deletedAt: null },
        orderBy: { email: 'asc' },
        skip: 5,
        take: 5,
      });
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { isActive: true, deletedAt: null },
      });
      expect(result.total).toBe(2);
      expect(result.items).toEqual([
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({ id: 2 }),
      ]);
    });
  });

  describe('findById', () => {
    it('should return the mapped entity when the user exists', async () => {
      const row = makeRawRow({ id: 10 });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(row);

      const result = await repository.findById(10);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 10 },
      });
      expect(result).toEqual(row);
    });

    it('should return null when the user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findActiveById', () => {
    it('should query with the active filter and return the mapped entity', async () => {
      const row = makeRawRow({ id: 3 });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(row);

      const result = await repository.findActiveById(3);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 3, isActive: true, deletedAt: null },
      });
      expect(result).toEqual(row);
    });

    it('should return null when no active user matches', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.findActiveById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should look up the user by unique email and return the mapped entity', async () => {
      const row = makeRawRow({ email: 'user@example.com' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(row);

      const result = await repository.findByEmail('user@example.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(result).toEqual(row);
    });

    it('should return null when no user matches the email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByEmail('missing@example.com');

      expect(result).toBeNull();
    });
  });

  describe('verifyAccount', () => {
    it('should return null without updating when no user matches the id and token', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.verifyAccount(1, 'bad-token');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 1, verifyToken: 'bad-token' },
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should activate the user and clear the verify token when found', async () => {
      const existing = makeRawRow({ id: 1, verifyToken: 'valid-token' });
      const updated = makeRawRow({ id: 1, isActive: true, verifyToken: null });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.user.update as jest.Mock).mockResolvedValue(updated);

      const result = await repository.verifyAccount(1, 'valid-token');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: true, verifyToken: null },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('createUser', () => {
    /**
     * `createUser` chạy create + update trong một transaction: `userCode` sinh
     * từ id nên chỉ gán được sau khi bản ghi tồn tại.
     */
    const mockCreateFlow = (id: number, email: string) => {
      const created = makeRawRow({ id, email });
      prisma.$transaction.mockImplementation(((
        callback: (tx: typeof prisma) => unknown,
      ) => callback(prisma)) as never);
      (prisma.user.create as jest.Mock).mockResolvedValue(created);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...created,
        userCode: buildUserCode(id),
      });
      return created;
    };

    it('should create a user with the provided displayName trimmed', async () => {
      mockCreateFlow(1, 'new@example.com');

      const result = await repository.createUser({
        email: 'new@example.com',
        displayName: '  New User  ',
        password: 'hashed',
        phone: '0123456789',
        verifyToken: 'token',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          displayName: 'New User',
          avatar: null,
          password: 'hashed',
          phone: '0123456789',
          verifyToken: 'token',
          isActive: false,
        },
      });
      expect(result.email).toBe('new@example.com');
    });

    it('should assign a userCode derived from the new user id', async () => {
      mockCreateFlow(42, 'coded@example.com');

      const result = await repository.createUser({
        email: 'coded@example.com',
        password: 'hashed',
        verifyToken: 'token',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { userCode: 'U-000042' },
      });
      expect(result.userCode).toBe('U-000042');
    });

    it('should not send userCode on the insert, since the id is not known yet', async () => {
      mockCreateFlow(7, 'jane@example.com');

      await repository.createUser({
        email: 'jane@example.com',
        password: 'hashed',
        verifyToken: 'token',
      });

      const insertArgs = prisma.user.create.mock.calls[0][0];
      expect(insertArgs.data).not.toHaveProperty('userCode');
    });

    it('should insert and assign the code inside a single transaction', async () => {
      mockCreateFlow(5, 'jane@example.com');

      await repository.createUser({
        email: 'jane@example.com',
        password: 'hashed',
        verifyToken: 'token',
      });

      // Nếu tách ra ngoài transaction, lỗi giữa 2 bước sẽ để lại user không có mã.
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should default displayName to the email local part when displayName is missing', async () => {
      mockCreateFlow(1, 'jane@example.com');

      await repository.createUser({
        email: 'jane@example.com',
        password: 'hashed',
        verifyToken: 'token',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ displayName: 'jane' }),
        }),
      );
    });

    it('should default displayName to the email local part when displayName is blank whitespace', async () => {
      mockCreateFlow(1, 'jane@example.com');

      await repository.createUser({
        email: 'jane@example.com',
        displayName: '   ',
        password: 'hashed',
        verifyToken: 'token',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ displayName: 'jane' }),
        }),
      );
    });

    it('should default phone to null when not provided', async () => {
      mockCreateFlow(1, 'jane@example.com');

      await repository.createUser({
        email: 'jane@example.com',
        password: 'hashed',
        verifyToken: 'token',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ phone: null }),
        }),
      );
    });
  });

  describe('updateUser', () => {
    it('should return null without updating when the user is not active', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.updateUser(1, { displayName: 'New' });

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should drop undefined keys but keep explicit false values when updating', async () => {
      const existing = makeRawRow({ id: 1 });
      const updated = makeRawRow({ id: 1, isActive: false });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.user.update as jest.Mock).mockResolvedValue(updated);

      const result = await repository.updateUser(1, {
        displayName: undefined,
        phone: undefined,
        isActive: false,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
      expect(result).toEqual(updated);
    });

    it('should include all provided fields when none are undefined', async () => {
      const existing = makeRawRow({ id: 1 });
      const updated = makeRawRow({ id: 1, displayName: 'New', phone: '123' });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.user.update as jest.Mock).mockResolvedValue(updated);

      await repository.updateUser(1, {
        displayName: 'New',
        phone: '123',
        isActive: true,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { displayName: 'New', phone: '123', isActive: true },
      });
    });
  });

  describe('updateProfile', () => {
    it('should return null without updating when the user is not active', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.updateProfile(1, {
        displayName: 'New',
      });

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should drop undefined keys but keep explicit null values when updating', async () => {
      const existing = makeRawRow({ id: 1 });
      const updated = makeRawRow({ id: 1, avatar: null });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.user.update as jest.Mock).mockResolvedValue(updated);

      const result = await repository.updateProfile(1, {
        displayName: undefined,
        avatar: null,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { avatar: null },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('updatePassword', () => {
    it('should update only the password field', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue(makeRawRow());

      await repository.updatePassword(1, 'hashed-password');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: 'hashed-password' },
      });
    });
  });

  describe('setResetPasswordToken', () => {
    it('should update the reset password token and expiry', async () => {
      const expiresAt = new Date('2026-01-01T00:00:00Z');
      (prisma.user.update as jest.Mock).mockResolvedValue(makeRawRow());

      await repository.setResetPasswordToken(1, 'reset-token', expiresAt);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          resetPasswordToken: 'reset-token',
          resetPasswordExpiresAt: expiresAt,
        },
      });
    });
  });

  describe('resetPassword', () => {
    it('should update the password and clear the reset password token and expiry', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue(makeRawRow());

      await repository.resetPassword(1, 'hashed-password');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          password: 'hashed-password',
          resetPasswordToken: null,
          resetPasswordExpiresAt: null,
        },
      });
    });
  });

  describe('softDelete', () => {
    it('should return null without updating when the user is not active', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.softDelete(1);

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should deactivate the user and set deletedAt when active', async () => {
      const existing = makeRawRow({ id: 1 });
      const updated = makeRawRow({
        id: 1,
        isActive: false,
        deletedAt: new Date(),
      });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.user.update as jest.Mock).mockResolvedValue(updated);

      const result = await repository.softDelete(1);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false, deletedAt: expect.any(Date) },
      });
      expect(result).toEqual(updated);
    });
  });
});
