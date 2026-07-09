import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateVersionDto,
  ListVersionsQueryDto,
  UpdateVersionDto,
} from './version.dto';

async function validateDto<T extends object>(cls: new () => T, payload: object) {
  const instance = plainToInstance(cls, payload);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { instance, errors };
}

describe('CreateVersionDto', () => {
  it('should pass validation with a full valid payload', async () => {
    const { errors } = await validateDto(CreateVersionDto, {
      name: 'v1.0',
      startDate: '2026-05-25',
      endDate: '2026-05-30',
      description: 'release notes',
    });

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with only the required name field', async () => {
    const { errors } = await validateDto(CreateVersionDto, { name: 'v1.0' });

    expect(errors).toHaveLength(0);
  });

  it('should fail validation when name is missing', async () => {
    const { errors } = await validateDto(CreateVersionDto, {});

    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('should fail validation when name is shorter than 3 characters', async () => {
    const { errors } = await validateDto(CreateVersionDto, { name: 'ab' });

    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('should pass validation when name is exactly 3 characters', async () => {
    const { errors } = await validateDto(CreateVersionDto, { name: 'abc' });

    expect(errors).toHaveLength(0);
  });

  it('should fail validation when name is longer than 50 characters', async () => {
    const { errors } = await validateDto(CreateVersionDto, {
      name: 'a'.repeat(51),
    });

    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('should pass validation when name is exactly 50 characters', async () => {
    const { errors } = await validateDto(CreateVersionDto, {
      name: 'a'.repeat(50),
    });

    expect(errors).toHaveLength(0);
  });

  it('should fail validation when name is not a string', async () => {
    const { errors } = await validateDto(CreateVersionDto, { name: 123 });

    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('should fail validation when startDate is not a valid date string', async () => {
    const { errors } = await validateDto(CreateVersionDto, {
      name: 'v1.0',
      startDate: 'not-a-date',
    });

    expect(errors.some((e) => e.property === 'startDate')).toBe(true);
  });

  it('should fail validation when endDate is not a valid date string', async () => {
    const { errors } = await validateDto(CreateVersionDto, {
      name: 'v1.0',
      endDate: 'not-a-date',
    });

    expect(errors.some((e) => e.property === 'endDate')).toBe(true);
  });

  it('should fail validation when description exceeds 500 characters', async () => {
    const { errors } = await validateDto(CreateVersionDto, {
      name: 'v1.0',
      description: 'a'.repeat(501),
    });

    expect(errors.some((e) => e.property === 'description')).toBe(true);
  });

  it('should pass validation when description is exactly 500 characters', async () => {
    const { errors } = await validateDto(CreateVersionDto, {
      name: 'v1.0',
      description: 'a'.repeat(500),
    });

    expect(errors).toHaveLength(0);
  });

  it('should fail validation when an unknown field is present', async () => {
    const { errors } = await validateDto(CreateVersionDto, {
      name: 'v1.0',
      boardId: 5,
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should not enforce a start-before-end date-range rule at the DTO level', async () => {
    const { errors } = await validateDto(CreateVersionDto, {
      name: 'v1.0',
      startDate: '2026-06-01',
      endDate: '2026-05-01',
    });

    expect(errors).toHaveLength(0);
  });
});

describe('UpdateVersionDto', () => {
  it('should pass validation with an empty payload since all fields are optional', async () => {
    const { errors } = await validateDto(UpdateVersionDto, {});

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with a partial payload', async () => {
    const { errors } = await validateDto(UpdateVersionDto, {
      name: 'v2.0',
    });

    expect(errors).toHaveLength(0);
  });

  it('should fail validation when name is shorter than 3 characters', async () => {
    const { errors } = await validateDto(UpdateVersionDto, { name: 'ab' });

    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('should fail validation when startDate is not a valid date string', async () => {
    const { errors } = await validateDto(UpdateVersionDto, {
      startDate: 'not-a-date',
    });

    expect(errors.some((e) => e.property === 'startDate')).toBe(true);
  });

  it('should fail validation when an unknown field is present', async () => {
    const { errors } = await validateDto(UpdateVersionDto, {
      unknownField: 'value',
    });

    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('ListVersionsQueryDto', () => {
  it('should default skip to 0 and limit to 10 when omitted', async () => {
    const { instance, errors } = await validateDto(ListVersionsQueryDto, {});

    expect(errors).toHaveLength(0);
    expect(instance.skip).toBe(0);
    expect(instance.limit).toBe(10);
  });

  it('should pass validation with a valid keyword, skip and limit', async () => {
    const { instance, errors } = await validateDto(ListVersionsQueryDto, {
      keyword: 'v1',
      skip: '5',
      limit: '20',
    });

    expect(errors).toHaveLength(0);
    expect(instance.skip).toBe(5);
    expect(instance.limit).toBe(20);
  });

  it('should fail validation when skip is negative', async () => {
    const { errors } = await validateDto(ListVersionsQueryDto, {
      skip: -1,
    });

    expect(errors.some((e) => e.property === 'skip')).toBe(true);
  });

  it('should fail validation when limit is 0', async () => {
    const { errors } = await validateDto(ListVersionsQueryDto, {
      limit: 0,
    });

    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('should fail validation when limit exceeds 100', async () => {
    const { errors } = await validateDto(ListVersionsQueryDto, {
      limit: 101,
    });

    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('should fail validation when skip is not an integer', async () => {
    const { errors } = await validateDto(ListVersionsQueryDto, {
      skip: 1.5,
    });

    expect(errors.some((e) => e.property === 'skip')).toBe(true);
  });

  it('should fail validation when keyword is not a string', async () => {
    const { errors } = await validateDto(ListVersionsQueryDto, {
      keyword: 123,
    });

    expect(errors.some((e) => e.property === 'keyword')).toBe(true);
  });

  it('should fail validation when an unknown field is present', async () => {
    const { errors } = await validateDto(ListVersionsQueryDto, {
      sortBy: 'name',
    });

    expect(errors.length).toBeGreaterThan(0);
  });
});
