import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ForgotPasswordDto } from './forgot-password.dto';

async function validateDto(payload: object) {
  const instance = plainToInstance(ForgotPasswordDto, payload);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { instance, errors };
}

describe('ForgotPasswordDto', () => {
  it('should pass validation with a valid email', async () => {
    const { errors } = await validateDto({ email: 'user@example.com' });

    expect(errors).toHaveLength(0);
  });

  it('should fail validation when email is malformed', async () => {
    const { errors } = await validateDto({ email: 'not-an-email' });

    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should fail validation when email is missing', async () => {
    const { errors } = await validateDto({});

    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should normalize email casing and whitespace on the instance', async () => {
    const { instance, errors } = await validateDto({
      email: '  User@Example.COM  ',
    });

    expect(errors).toHaveLength(0);
    expect(instance.email).toBe('user@example.com');
  });

  it('should fail validation when an unknown field is present', async () => {
    const { errors } = await validateDto({
      email: 'user@example.com',
      extra: 'field',
    });

    expect(errors.length).toBeGreaterThan(0);
  });
});
