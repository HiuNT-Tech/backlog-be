import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';

const VALIDATOR_OPTIONS = { whitelist: true, forbidNonWhitelisted: true };

describe('UpdateUserDto', () => {
  it('should pass validation with a valid full payload', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      displayName: 'John Doe',
      phone: '0123456789',
      isActive: true,
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with an empty payload since all fields are optional', async () => {
    const dto = plainToInstance(UpdateUserDto, {});

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(0);
  });

  it('should trim and collapse whitespace in displayName via the @Transform decorator', () => {
    const dto = plainToInstance(UpdateUserDto, {
      displayName: '  John   Doe  ',
    });

    expect(dto.displayName).toBe('John Doe');
  });

  it('should fail validation when displayName is shorter than 2 characters', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      displayName: 'A',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('displayName');
    expect(errors[0].constraints).toHaveProperty('minLength');
  });

  it('should fail validation when phone is not a string', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      phone: 123456789,
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('phone');
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('should transform the string "true" to a boolean true for isActive via @Type(Boolean)', () => {
    const dto = plainToInstance(UpdateUserDto, {
      isActive: 'true',
    });

    expect(dto.isActive).toBe(true);
  });

  it('should transform the string "false" to a boolean true because @Type(Boolean) coerces any non-empty string truthily', () => {
    const dto = plainToInstance(UpdateUserDto, {
      isActive: 'false',
    });

    // NOTE: this documents actual (surprising) current behavior of `@Type(() => Boolean)`:
    // it uses the Boolean() constructor semantics, so any non-empty string (including "false")
    // becomes `true`. This is a pre-existing quirk of the DTO, not something introduced by tests.
    expect(dto.isActive).toBe(true);
  });

  it('should fail validation when isActive is an array, since @Type(Boolean) maps each element instead of yielding a single boolean', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      isActive: [1, 2, 3],
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('isActive');
    expect(errors[0].constraints).toHaveProperty('isBoolean');
  });

  it('should reject unknown properties due to forbidNonWhitelisted', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      email: 'user@example.com',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });
});
