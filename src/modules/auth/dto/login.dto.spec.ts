import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

async function validateDto(payload: object) {
  const instance = plainToInstance(LoginDto, payload);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { instance, errors };
}

describe('LoginDto', () => {
  it('should pass validation with a valid payload', async () => {
    const { errors } = await validateDto({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(errors).toHaveLength(0);
  });

  it('should fail validation when email is malformed', async () => {
    const { errors } = await validateDto({
      email: 'not-an-email',
      password: 'password123',
    });

    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should normalize email casing and whitespace on the instance', async () => {
    const { instance, errors } = await validateDto({
      email: '  User@Example.COM  ',
      password: 'password123',
    });

    expect(errors).toHaveLength(0);
    expect(instance.email).toBe('user@example.com');
  });

  it('should fail validation when password is shorter than 8 characters', async () => {
    const { errors } = await validateDto({
      email: 'user@example.com',
      password: 'short',
    });

    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('should fail validation when an unknown field is present', async () => {
    const { errors } = await validateDto({
      email: 'user@example.com',
      password: 'password123',
      remember: true,
    });

    expect(errors.length).toBeGreaterThan(0);
  });
});
