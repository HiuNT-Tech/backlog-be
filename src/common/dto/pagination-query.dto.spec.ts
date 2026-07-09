import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

const VALIDATOR_OPTIONS = { whitelist: true, forbidNonWhitelisted: true };

describe('PaginationQueryDto', () => {
  it('should default page=1, limit=10, sortBy="createdAt" and sortOrder="desc" when no query params are given', async () => {
    const dto = plainToInstance(PaginationQueryDto, {});

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
    expect(dto.sortBy).toBe('createdAt');
    expect(dto.sortOrder).toBe('desc');
  });

  it('should fail validation when limit exceeds the max of 100', async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      limit: '101',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors.some((e) => e.property === 'limit')).toBe(true);
    const limitError = errors.find((e) => e.property === 'limit');
    expect(limitError?.constraints).toHaveProperty('max');
  });

  it('should pass validation when limit is exactly 100', async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      limit: '100',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(100);
  });

  it('should fail validation when page is less than 1', async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      page: '0',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors.some((e) => e.property === 'page')).toBe(true);
    const pageError = errors.find((e) => e.property === 'page');
    expect(pageError?.constraints).toHaveProperty('min');
  });

  it('should fail validation when page is not an integer', async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      page: 'abc',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors.some((e) => e.property === 'page')).toBe(true);
    const pageError = errors.find((e) => e.property === 'page');
    expect(pageError?.constraints).toHaveProperty('isInt');
  });

  it('should fail validation when sortOrder is outside the allowed values', async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      sortOrder: 'ascending',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors.some((e) => e.property === 'sortOrder')).toBe(true);
    const sortOrderError = errors.find((e) => e.property === 'sortOrder');
    expect(sortOrderError?.constraints).toHaveProperty('isIn');
  });

  it('should pass validation with sortOrder "asc"', async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      sortOrder: 'asc',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(0);
    expect(dto.sortOrder).toBe('asc');
  });

  it('should transform the numeric query string "page=2" into a real number', async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      page: '2',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(typeof dto.page).toBe('number');
  });

  it('should reject unknown properties due to forbidNonWhitelisted', async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      search: 'foo',
    });

    const errors = await validate(dto, VALIDATOR_OPTIONS);

    expect(errors.some((e) => e.property === 'search')).toBe(true);
  });
});
