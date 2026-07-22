export class UserEntity {
  id: number;
  email: string;
  displayName: string;
  avatar: string | null;
  userCode: string | null;
  password: string;
  phone: string | null;
  verifyToken: string | null;
  resetPasswordToken: string | null;
  resetPasswordExpiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
