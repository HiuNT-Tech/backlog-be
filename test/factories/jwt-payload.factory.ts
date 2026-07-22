import { JwtPayload } from '@/types/jwt-payload.type';

export const makeJwtPayload = (over: Partial<JwtPayload> = {}): JwtPayload => ({
  userId: 1,
  email: 'user@example.com',
  ...over,
});
