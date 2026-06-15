import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';

type EnvelopeOptions = {
  description?: string;
};

type ListEnvelopeOptions = EnvelopeOptions & {
  /** Counter field name used by the endpoint. Defaults to `total`. */
  counter?: 'total' | 'count';
};

const itemSchema = (model: Type<unknown>) => ({
  type: 'object' as const,
  properties: {
    item: { $ref: getSchemaPath(model) },
  },
  required: ['item'],
});

const listSchema = (model: Type<unknown>, counter: 'total' | 'count') => ({
  type: 'object' as const,
  properties: {
    items: {
      type: 'array' as const,
      items: { $ref: getSchemaPath(model) },
    },
    [counter]: { type: 'number' as const, example: 10 },
  },
  required: ['items', counter],
});

/**
 * 200 response wrapped in the single-resource envelope: `{ item: Model }`.
 */
export function ApiItemResponse(
  model: Type<unknown>,
  options: EnvelopeOptions = {},
) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: options.description,
      schema: itemSchema(model),
    }),
  );
}

/**
 * 201 response wrapped in the single-resource envelope: `{ item: Model }`.
 */
export function ApiItemCreatedResponse(
  model: Type<unknown>,
  options: EnvelopeOptions = {},
) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiCreatedResponse({
      description: options.description,
      schema: itemSchema(model),
    }),
  );
}

/**
 * 200 response wrapped in the list envelope: `{ items: Model[], total|count }`.
 */
export function ApiListResponse(
  model: Type<unknown>,
  options: ListEnvelopeOptions = {},
) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: options.description,
      schema: listSchema(model, options.counter ?? 'total'),
    }),
  );
}
