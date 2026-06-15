import { UserEntity } from '@modules/users/entities/user.entity';
import { Role } from '@common/enums/role.enum';

export const makeUserEntity = (over: Partial<UserEntity> = {}): UserEntity => ({
  id: 1,
  email: 'user@example.com',
  displayName: 'User',
  avatar: null,
  userCode: null,
  password: '$2b$10$hashedpassword',
  phone: null,
  role: Role.USER,
  verifyToken: null,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  ...over,
});
