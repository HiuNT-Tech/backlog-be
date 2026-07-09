import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ResetPasswordDto } from './reset-password.dto';

async function validateDto(payload: object) {
  const instance = plainToInstance(ResetPasswordDto, payload);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { instance, errors };
}

describe('ResetPasswordDto', () => {
  it('should pass validation with a valid payload', async () => {
    const { errors } = await validateDto({
      email: 'user@example.com',
      token: 'reset-token',
      newPassword: 'newPassword123',
    });

    expect(errors).toHaveLength(0);
  });

  it('should fail validation when email is malformed', async () => {
    const { errors } = await validateDto({
      email: 'not-an-email',
      token: 'reset-token',
      newPassword: 'newPassword123',
    });

    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should normalize email casing and whitespace on the instance', async () => {
    const { instance, errors } = await validateDto({
      email: '  User@Example.COM  ',
      token: 'reset-token',
      newPassword: 'newPassword123',
    });

    expect(errors).toHaveLength(0);
    expect(instance.email).toBe('user@example.com');
  });

  it('should fail validation when token is missing', async () => {
    const { errors } = await validateDto({
      email: 'user@example.com',
      newPassword: 'newPassword123',
    });

    expect(errors.some((e) => e.property === 'token')).toBe(true);
  });

  it('should fail validation when newPassword is shorter than 8 characters', async () => {
    const { errors } = await validateDto({
      email: 'user@example.com',
      token: 'reset-token',
      newPassword: 'short',
    });

    expect(errors.some((e) => e.property === 'newPassword')).toBe(true);
  });

  it('should fail validation when newPassword is missing', async () => {
    const { errors } = await validateDto({
      email: 'user@example.com',
      token: 'reset-token',
    });

    expect(errors.some((e) => e.property === 'newPassword')).toBe(true);
  });

  it('should fail validation when an unknown field is present', async () => {
    const { errors } = await validateDto({
      email: 'user@example.com',
      token: 'reset-token',
      newPassword: 'newPassword123',
      extra: 'field',
    });

    expect(errors.length).toBeGreaterThan(0);
  });
});
