import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VerifyAccountDto } from './verify-account.dto';

const VALIDATOR_OPTIONS = { whitelist: true, forbidNonWhitelisted: true };

describe('VerifyAccountDto', () => {
  it('should pass validation with a valid payload', async () => {
    const dto = plainToInstance(VerifyAccountDto, {
      email: 'user@example.com',
      token: 'verification-token',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(0);
  });

  it('should normalize and lowercase the email via the @Transform decorator', () => {
    const dto = plainToInstance(VerifyAccountDto, {
      email: '  USER@Example.COM  ',
      token: 'verification-token',
    });

    expect(dto.email).toBe('user@example.com');
  });

  it('should fail validation when email is invalid', async () => {
    const dto = plainToInstance(VerifyAccountDto, {
      email: 'not-an-email',
      token: 'verification-token',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
    expect(errors[0].constraints).toHaveProperty('isEmail');
  });

  it('should fail validation when email is missing', async () => {
    const dto = plainToInstance(VerifyAccountDto, {
      token: 'verification-token',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should fail validation when token is missing', async () => {
    const dto = plainToInstance(VerifyAccountDto, {
      email: 'user@example.com',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors.some((e) => e.property === 'token')).toBe(true);
  });

  it('should fail validation when token is not a string', async () => {
    const dto = plainToInstance(VerifyAccountDto, {
      email: 'user@example.com',
      token: 12345,
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('token');
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('should reject unknown properties due to forbidNonWhitelisted', async () => {
    const dto = plainToInstance(VerifyAccountDto, {
      email: 'user@example.com',
      token: 'verification-token',
      extra: 'field',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors.some((e) => e.property === 'extra')).toBe(true);
  });
});
