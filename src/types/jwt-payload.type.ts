import { Role } from '@common/enums/role.enum';

export type JwtPayload = {
  userId: number;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
};
