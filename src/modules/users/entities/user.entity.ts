import { Role } from '@common/enums/role.enum';

export class UserEntity {
  id: string;
  email: string;
  name: string;
  username: string;
  displayName: string;
  avatar: string | null;
  userCode: string | null;
  password: string;
  phone: string | null;
  role: Role;
  verifyToken: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
