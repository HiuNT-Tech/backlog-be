import { Injectable, PipeTransform } from '@nestjs/common';
import {
  UploadedFile,
  UploadValidationOptions,
  UseFilesUploadOptions,
} from './upload.types';
import { validateUploadedFile, validateUploadedFiles } from './upload.utils';

@Injectable()
export class UploadedFileValidationPipe implements PipeTransform<
  UploadedFile | undefined,
  UploadedFile | undefined
> {
  constructor(private readonly options: UploadValidationOptions = {}) {}

  transform(file: UploadedFile | undefined): UploadedFile | undefined {
    return validateUploadedFile(file, this.options);
  }
}

@Injectable()
export class UploadedFilesValidationPipe implements PipeTransform<
  UploadedFile[] | undefined,
  UploadedFile[]
> {
  constructor(private readonly options: UseFilesUploadOptions = {}) {}

  transform(files: UploadedFile[] | undefined): UploadedFile[] {
    return validateUploadedFiles(files, this.options);
  }
}

export const createUploadedFilePipe = (options: UploadValidationOptions = {}) =>
  new UploadedFileValidationPipe(options);

export const createUploadedFilesPipe = (options: UseFilesUploadOptions = {}) =>
  new UploadedFilesValidationPipe(options);
