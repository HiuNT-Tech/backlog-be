import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChangePasswordDto } from './change-password.dto';

const VALIDATOR_OPTIONS = { whitelist: true, forbidNonWhitelisted: true };

describe('ChangePasswordDto', () => {
  it('should pass validation with a valid payload', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      currentPassword: 'currentPassword123',
      newPassword: 'newPassword123',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation when currentPassword is missing', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      newPassword: 'newPassword123',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors.some((e) => e.property === 'currentPassword')).toBe(true);
  });

  it('should fail validation when currentPassword is not a string', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      currentPassword: 12345,
      newPassword: 'newPassword123',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors.some((e) => e.property === 'currentPassword')).toBe(true);
    const currentPasswordError = errors.find(
      (e) => e.property === 'currentPassword',
    );
    expect(currentPasswordError?.constraints).toHaveProperty('isString');
  });

  it('should fail validation when newPassword is missing', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      currentPassword: 'currentPassword123',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors.some((e) => e.property === 'newPassword')).toBe(true);
  });

  it('should fail validation when newPassword is shorter than 8 characters', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      currentPassword: 'currentPassword123',
      newPassword: 'short1',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('newPassword');
    expect(errors[0].constraints).toHaveProperty('minLength');
  });

  it('should pass validation when newPassword is exactly 8 characters', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      currentPassword: 'currentPassword123',
      newPassword: '12345678',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(0);
  });

  it('should reject unknown properties due to forbidNonWhitelisted', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      currentPassword: 'currentPassword123',
      newPassword: 'newPassword123',
      confirmPassword: 'newPassword123',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors.some((e) => e.property === 'confirmPassword')).toBe(true);
  });
});
