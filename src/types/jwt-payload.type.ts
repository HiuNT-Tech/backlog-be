import { Role } from '@common/enums/role.enum';

export type JwtPayload = {
  _id?: string;
  userId: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
};
