import { Injectable } from '@nestjs/common';

export type UploadInput = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

export type UploadResult = {
  key: string;
  url: string;
};

@Injectable()
export class StorageService {
  upload(input: UploadInput): Promise<UploadResult> {
    const key = `${Date.now()}-${input.filename}`;

    return Promise.resolve({
      key,
      url: `/uploads/${key}`,
    });
  }
}
