import { Role } from '@common/enums/role.enum';

export class UserEntity {
  id: string;
  email: string;
  name: string;
  password: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
