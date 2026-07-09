import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateCommentDto,
  ListCommentsQueryDto,
  UpdateCommentDto,
} from './comment.dto';

async function validateDto<T extends object>(
  cls: new () => T,
  payload: object,
): Promise<{ instance: T; errors: Awaited<ReturnType<typeof validate>> }> {
  const instance = plainToInstance(cls, payload);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { instance, errors };
}

const expectValid = async <T extends object>(
  cls: new () => T,
  payload: object,
) => {
  const { errors } = await validateDto(cls, payload);
  expect(errors).toHaveLength(0);
};

const expectInvalid = async <T extends object>(
  cls: new () => T,
  payload: object,
  field?: string,
) => {
  const { errors } = await validateDto(cls, payload);
  expect(errors.length).toBeGreaterThan(0);
  if (field) {
    expect(errors.some((e) => e.property === field)).toBe(true);
  }
};

describe('CreateCommentDto', () => {
  it('should be valid when content is a non-empty string within the length limit', async () => {
    await expectValid(CreateCommentDto, { content: 'This is a comment' });
  });

  it('should be valid when content is missing (attachment-only comment)', async () => {
    await expectValid(CreateCommentDto, {});
  });

  it('should be valid when content is an empty string', async () => {
    await expectValid(CreateCommentDto, { content: '' });
  });

  it('should be invalid when content exceeds 5000 characters', async () => {
    await expectInvalid(
      CreateCommentDto,
      { content: 'a'.repeat(5001) },
      'content',
    );
  });

  it('should be valid when content is exactly 5000 characters', async () => {
    await expectValid(CreateCommentDto, { content: 'a'.repeat(5000) });
  });

  it('should be invalid when content is not a string', async () => {
    await expectInvalid(CreateCommentDto, { content: 123 }, 'content');
  });

  it('should be invalid when an extra field is provided', async () => {
    await expectInvalid(CreateCommentDto, {
      content: 'Hello',
      cardId: 1,
    });
  });
});

describe('UpdateCommentDto', () => {
  it('should be valid when content is a non-empty string within the length limit', async () => {
    await expectValid(UpdateCommentDto, { content: 'Updated comment' });
  });

  it('should be valid when content is missing', async () => {
    await expectValid(UpdateCommentDto, {});
  });

  it('should be valid when content is an empty string', async () => {
    await expectValid(UpdateCommentDto, { content: '' });
  });

  it('should be invalid when content exceeds 5000 characters', async () => {
    await expectInvalid(
      UpdateCommentDto,
      { content: 'a'.repeat(5001) },
      'content',
    );
  });

  it('should be valid with removeAttachmentIds as an array of ids', async () => {
    await expectValid(UpdateCommentDto, {
      content: 'Updated',
      removeAttachmentIds: [1, 2, 3],
    });
  });

  it('should be invalid when an extra field is provided', async () => {
    await expectInvalid(UpdateCommentDto, {
      content: 'Hello',
      extra: true,
    });
  });
});

describe('ListCommentsQueryDto', () => {
  it('should default skip to 0 and limit to 20 when neither is provided', async () => {
    const { instance, errors } = await validateDto(ListCommentsQueryDto, {});

    expect(errors).toHaveLength(0);
    expect(instance.skip).toBe(0);
    expect(instance.limit).toBe(20);
  });

  it('should transform numeric strings for skip and limit', async () => {
    const { instance, errors } = await validateDto(ListCommentsQueryDto, {
      skip: '10',
      limit: '5',
    });

    expect(errors).toHaveLength(0);
    expect(instance.skip).toBe(10);
    expect(instance.limit).toBe(5);
  });

  it('should be invalid when skip is negative', async () => {
    await expectInvalid(ListCommentsQueryDto, { skip: -1 }, 'skip');
  });

  it('should be invalid when limit is less than 1', async () => {
    await expectInvalid(ListCommentsQueryDto, { limit: 0 }, 'limit');
  });

  it('should be invalid when skip is not an integer', async () => {
    await expectInvalid(ListCommentsQueryDto, { skip: 'abc' }, 'skip');
  });

  it('should be invalid when limit is not an integer', async () => {
    await expectInvalid(ListCommentsQueryDto, { limit: 'abc' }, 'limit');
  });

  it('should be invalid when an extra field is provided', async () => {
    await expectInvalid(ListCommentsQueryDto, {
      skip: 0,
      limit: 20,
      sortBy: 'createdAt',
    });
  });
});
