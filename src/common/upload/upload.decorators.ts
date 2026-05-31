import { applyDecorators, UseInterceptors } from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import {
  DEFAULT_UPLOAD_FIELD_NAME,
  DEFAULT_UPLOAD_MAX_FILES,
} from './upload.constants';
import {
  ApiMultipleFilesUploadOptions,
  ApiSingleFileUploadOptions,
  UseFileUploadOptions,
  UseFilesUploadOptions,
} from './upload.types';
import { createMulterOptions } from './upload.utils';

export function ApiSingleFileUploadDocs(
  options: ApiSingleFileUploadOptions = {},
) {
  const fieldName = options.fieldName ?? DEFAULT_UPLOAD_FIELD_NAME;
  const fileSchema = {
    type: 'string',
    format: 'binary',
    description: options.allowedMimeTypes?.length
      ? `Allowed types: ${options.allowedMimeTypes.join(', ')}`
      : undefined,
  };

  return applyDecorators(
    ...(options.bodyType ? [ApiExtraModels(options.bodyType)] : []),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      required: options.required ?? true,
      schema: {
        allOf: [
          ...(options.bodyType
            ? [{ $ref: getSchemaPath(options.bodyType) }]
            : []),
          {
            type: 'object',
            required: options.required === false ? [] : [fieldName],
            properties: {
              ...(options.extraFields ?? {}),
              [fieldName]: fileSchema,
            },
          },
        ],
      },
    }),
  );
}

export function ApiMultipleFilesUploadDocs(
  options: ApiMultipleFilesUploadOptions = {},
) {
  const fieldName = options.fieldName ?? DEFAULT_UPLOAD_FIELD_NAME;

  return applyDecorators(
    ...(options.bodyType ? [ApiExtraModels(options.bodyType)] : []),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      required: options.required ?? true,
      schema: {
        allOf: [
          ...(options.bodyType
            ? [{ $ref: getSchemaPath(options.bodyType) }]
            : []),
          {
            type: 'object',
            required: options.required === false ? [] : [fieldName],
            properties: {
              ...(options.extraFields ?? {}),
              [fieldName]: {
                type: 'array',
                maxItems: options.maxFiles ?? DEFAULT_UPLOAD_MAX_FILES,
                items: {
                  type: 'string',
                  format: 'binary',
                },
              },
            },
          },
        ],
      },
    }),
  );
}

export function UseSingleFileUpload(options: UseFileUploadOptions = {}) {
  const fieldName = options.fieldName ?? DEFAULT_UPLOAD_FIELD_NAME;

  return applyDecorators(
    UseInterceptors(FileInterceptor(fieldName, createMulterOptions(options))),
  );
}

export function UseMultipleFilesUpload(options: UseFilesUploadOptions = {}) {
  const fieldName = options.fieldName ?? DEFAULT_UPLOAD_FIELD_NAME;
  const maxFiles = options.maxFiles ?? DEFAULT_UPLOAD_MAX_FILES;

  return applyDecorators(
    UseInterceptors(
      FilesInterceptor(fieldName, maxFiles, createMulterOptions(options)),
    ),
  );
}

export function UseFileFieldsUpload(
  fields: { name: string; maxCount?: number }[],
  options: UseFilesUploadOptions = {},
) {
  return applyDecorators(
    UseInterceptors(
      FileFieldsInterceptor(fields, createMulterOptions(options)),
    ),
  );
}
