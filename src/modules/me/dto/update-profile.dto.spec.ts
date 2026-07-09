import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto';

const VALIDATOR_OPTIONS = { whitelist: true, forbidNonWhitelisted: true };

describe('UpdateProfileDto', () => {
  it('should pass validation with a valid full payload', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      displayName: 'John Doe',
      avatar: 'https://example.com/avatar.png',
      phone: '0901234567',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with an empty payload since all fields are optional', async () => {
    const dto = plainToInstance(UpdateProfileDto, {});

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(0);
  });

  it('should trim and collapse whitespace in displayName via the @Transform decorator', () => {
    const dto = plainToInstance(UpdateProfileDto, {
      displayName: '  John   Doe  ',
    });

    expect(dto.displayName).toBe('John Doe');
  });

  it('should fail validation when displayName is shorter than 2 characters', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      displayName: 'A',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('displayName');
    expect(errors[0].constraints).toHaveProperty('minLength');
  });

  it('should fail validation when displayName is not a string', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      displayName: 12345,
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('displayName');
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('should fail validation when avatar is not a valid URL', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      avatar: 'not-a-url',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('avatar');
    expect(errors[0].constraints).toHaveProperty('isUrl');
  });

  it('should fail validation when phone is not a string', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      phone: 901234567,
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('phone');
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('should reject unknown properties due to forbidNonWhitelisted', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      email: 'user@example.com',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });
});
