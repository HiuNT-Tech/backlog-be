export type JwtPayload = {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
};
