import { JwtPayload } from '@/types/jwt-payload.type';
import { Role } from '@common/enums/role.enum';

export const makeJwtPayload = (over: Partial<JwtPayload> = {}): JwtPayload => ({
  userId: 1,
  email: 'user@example.com',
  role: Role.USER,
  ...over,
});
