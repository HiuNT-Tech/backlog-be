import { UserEntity } from '@modules/users/entities/user.entity';

export const makeUserEntity = (over: Partial<UserEntity> = {}): UserEntity => ({
  id: 1,
  email: 'user@example.com',
  displayName: 'User',
  avatar: null,
  userCode: null,
  password: '$2b$10$hashedpassword',
  phone: null,
  verifyToken: null,
  resetPasswordToken: null,
  resetPasswordExpiresAt: null,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  ...over,
});
