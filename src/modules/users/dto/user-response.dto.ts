import { Role } from '@common/enums/role.enum';

export type UserResponseSource = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role | string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  constructor(user: UserResponseSource) {
    this.id = user.id;
    this.email = user.email;
    this.name = user.name;
    this.phone = user.phone;
    this.role = user.role as Role;
    this.isActive = user.isActive;
    this.createdAt = user.createdAt.toISOString();
    this.updatedAt = user.updatedAt.toISOString();
  }
}
