import { Role } from '@common/enums/role.enum';

export type UserResponseSource = {
  id: string;
  email: string;
  name: string;
  username: string;
  displayName: string;
  avatar: string | null;
  userCode: string | null;
  phone: string | null;
  role: Role | string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  verifyToken: string | null;
};

export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  username: string;
  displayName: string;
  avatar: string | null;
  userCode: string | null;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  verifyToken: string | null;

  constructor(user: UserResponseSource) {
    this.id = user.id;
    this.email = user.email;
    this.name = user.name;
    this.username = user.username;
    this.displayName = user.displayName;
    this.avatar = user.avatar;
    this.userCode = user.userCode;
    this.phone = user.phone;
    this.role = user.role as Role;
    this.isActive = user.isActive;
    this.createdAt = user.createdAt.toISOString();
    this.updatedAt = user.updatedAt.toISOString();
    this.verifyToken = user.verifyToken;
  }
}
