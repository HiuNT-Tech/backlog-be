import { Role } from '@common/enums/role.enum';

export type UserResponseSource = {
  id: number;
  email: string;
  displayName: string;
  avatar: string | null;
  userCode: string | null;
  phone: string | null;
  role: Role | string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class UserResponseDto {
  id: number;
  email: string;
  displayName: string;
  avatar: string | null;
  userCode: string | null;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  constructor(user: UserResponseSource) {
    this.id = user.id;
    this.email = user.email;
    this.displayName = user.displayName;
    this.avatar = user.avatar;
    this.userCode = user.userCode;
    this.phone = user.phone;
    this.role = user.role as Role;
    this.isActive = user.isActive;
    this.createdAt = user.createdAt.toISOString();
    this.updatedAt = user.updatedAt.toISOString();
  }
}
