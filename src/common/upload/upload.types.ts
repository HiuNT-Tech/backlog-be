import { Type } from '@nestjs/common';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export type UploadedFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  filename?: string;
  path?: string;
};

export type UploadFileFilterCallback = (
  error: Error | null,
  acceptFile: boolean,
) => void;

export type UploadFileFilter = (
  request: unknown,
  file: UploadedFile,
  callback: UploadFileFilterCallback,
) => void;

export type UploadMulterOptions = {
  limits?: {
    fileSize?: number;
    files?: number;
  };
  fileFilter?: UploadFileFilter;
};

export type UploadValidationOptions = {
  required?: boolean;
  maxSizeBytes?: number;
  allowedMimeTypes?: readonly string[];
};

export type MultipartFieldSchema = SchemaObject;

export type ApiSingleFileUploadOptions = {
  fieldName?: string;
  required?: boolean;
  allowedMimeTypes?: readonly string[];
  bodyType?: Type<unknown>;
  extraFields?: Record<string, MultipartFieldSchema>;
};

export type ApiMultipleFilesUploadOptions = ApiSingleFileUploadOptions & {
  maxFiles?: number;
};

export type UseFileUploadOptions = UploadValidationOptions & {
  fieldName?: string;
};

export type UseFilesUploadOptions = UseFileUploadOptions & {
  maxFiles?: number;
};
