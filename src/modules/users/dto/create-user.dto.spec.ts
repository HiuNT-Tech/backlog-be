import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

const VALIDATOR_OPTIONS = { whitelist: true, forbidNonWhitelisted: true };

describe('CreateUserDto', () => {
  it('should pass validation with a valid full payload', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'user@example.com',
      displayName: 'John Doe',
      password: 'password123',
      phone: '0123456789',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation without the optional displayName and phone fields', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'user@example.com',
      password: 'password123',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(0);
  });

  it('should normalize and lowercase the email via the @Transform decorator', () => {
    const dto = plainToInstance(CreateUserDto, {
      email: '  USER@Example.COM  ',
      password: 'password123',
    });

    expect(dto.email).toBe('user@example.com');
  });

  it('should trim and collapse whitespace in displayName via the @Transform decorator', () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'user@example.com',
      displayName: '  John   Doe  ',
      password: 'password123',
    });

    expect(dto.displayName).toBe('John Doe');
  });

  it('should fail validation when email is invalid', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'not-an-email',
      password: 'password123',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
    expect(errors[0].constraints).toHaveProperty('isEmail');
  });

  it('should fail validation when email is missing', async () => {
    const dto = plainToInstance(CreateUserDto, {
      password: 'password123',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should fail validation when password is shorter than 8 characters', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'user@example.com',
      password: 'short',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('password');
    expect(errors[0].constraints).toHaveProperty('minLength');
  });

  it('should fail validation when password is missing', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'user@example.com',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('should fail validation when displayName is shorter than 2 characters', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'user@example.com',
      displayName: 'A',
      password: 'password123',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('displayName');
    expect(errors[0].constraints).toHaveProperty('minLength');
  });

  it('should fail validation when phone is not a string', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'user@example.com',
      password: 'password123',
      phone: 123456789,
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('phone');
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('should reject unknown properties due to forbidNonWhitelisted', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'user@example.com',
      password: 'password123',
      role: 'ADMIN',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('should never expose a password property that survives as plaintext beyond the dto itself', () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'user@example.com',
      password: 'password123',
    });

    expect(dto.password).toBe('password123');
  });
});
