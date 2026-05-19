import { Role } from '@common/enums/role.enum';

declare global {
  namespace Express {
    interface User {
      userId: string;
      email: string;
      role: Role;
      iat?: number;
      exp?: number;
    }
  }
}

export {};
