import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES,
  DEFAULT_UPLOAD_MIME_TYPES,
} from './upload.constants';
import {
  UploadedFile,
  UploadFileFilter,
  UploadMulterOptions,
  UploadValidationOptions,
} from './upload.types';

export const normalizeUploadOptions = (
  options: UploadValidationOptions = {},
): Required<UploadValidationOptions> => ({
  required: options.required ?? true,
  maxSizeBytes: options.maxSizeBytes ?? DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES,
  allowedMimeTypes: options.allowedMimeTypes ?? DEFAULT_UPLOAD_MIME_TYPES,
});

export const createUploadFileFilter = (
  allowedMimeTypes: readonly string[] = DEFAULT_UPLOAD_MIME_TYPES,
): UploadFileFilter => {
  return (_request, file, callback) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(
      new BadRequestException(`Unsupported file type: ${file.mimetype}`),
      false,
    );
  };
};

export const createMulterOptions = (
  options: UploadValidationOptions & { maxFiles?: number } = {},
): UploadMulterOptions => {
  const normalized = normalizeUploadOptions(options);

  return {
    limits: {
      fileSize: normalized.maxSizeBytes,
      files: options.maxFiles,
    },
    fileFilter: createUploadFileFilter(normalized.allowedMimeTypes),
  };
};

export const validateUploadedFile = (
  file: UploadedFile | undefined,
  options: UploadValidationOptions = {},
): UploadedFile | undefined => {
  const normalized = normalizeUploadOptions(options);

  if (!file) {
    if (normalized.required) {
      throw new BadRequestException('File is required.');
    }

    return undefined;
  }

  if (file.size > normalized.maxSizeBytes) {
    throw new BadRequestException(
      `File size must be <= ${normalized.maxSizeBytes} bytes.`,
    );
  }

  if (!normalized.allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
  }

  return file;
};

export const validateUploadedFiles = (
  files: UploadedFile[] | undefined,
  options: UploadValidationOptions & { maxFiles?: number } = {},
): UploadedFile[] => {
  const normalized = normalizeUploadOptions(options);

  if (!files || files.length === 0) {
    if (normalized.required) {
      throw new BadRequestException('At least one file is required.');
    }

    return [];
  }

  if (options.maxFiles !== undefined && files.length > options.maxFiles) {
    throw new BadRequestException(`Maximum ${options.maxFiles} files allowed.`);
  }

  return files.map((file) => validateUploadedFile(file, options)!);
};
