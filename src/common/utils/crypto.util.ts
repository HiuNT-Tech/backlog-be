import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

const SALT_ROUNDS = 10;

export const hashPassword = (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateRandomToken = (): string => {
  return randomUUID();
};
