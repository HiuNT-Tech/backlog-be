import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type UploadInput = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

export type UploadResult = {
  key: string;
  url: string;
};

export type AccessTarget =
  | { type: 'redirect'; url: string }
  | { type: 'local'; absolutePath: string };

type StorageDriver = 'local' | 's3';

type S3Options = {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle: boolean;
  keyPrefix: string;
  publicUrl?: string;
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: StorageDriver;

  // Local driver
  private readonly uploadDir: string;
  private readonly localBaseUrl: string;

  // S3 driver
  private readonly s3Options: S3Options;
  private s3Client?: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.driver = this.configService.get<StorageDriver>(
      'storage.driver',
      'local',
    );

    this.uploadDir = this.configService.get<string>(
      'storage.uploadDir',
      'uploads',
    );
    this.localBaseUrl = this.configService
      .get<string>('storage.uploadBaseUrl', '/uploads')
      .replace(/\/+$/, '');

    this.s3Options = this.configService.get<S3Options>('storage.s3', {
      region: 'ap-southeast-1',
      bucket: '',
      accessKeyId: '',
      secretAccessKey: '',
      forcePathStyle: false,
      keyPrefix: 'attachments',
    });
  }

  async upload(input: UploadInput): Promise<UploadResult> {
    const ext = extname(input.filename);
    const filename = `${randomUUID()}${ext}`;

    if (this.driver === 's3') {
      return this.uploadToS3(filename, input);
    }

    return this.uploadToLocal(filename, input);
  }

  private async uploadToLocal(
    filename: string,
    input: UploadInput,
  ): Promise<UploadResult> {
    await mkdir(this.uploadDir, { recursive: true });
    await writeFile(join(this.uploadDir, filename), input.buffer);

    return {
      key: filename,
      url: `${this.localBaseUrl}/${filename}`,
    };
  }

  private async uploadToS3(
    filename: string,
    input: UploadInput,
  ): Promise<UploadResult> {
    const { bucket, keyPrefix } = this.s3Options;
    if (!bucket) {
      throw new Error(
        'S3 bucket is not configured. Set S3_BUCKET (and S3 credentials) in the environment.',
      );
    }

    const key = keyPrefix ? `${keyPrefix}/${filename}` : filename;

    await this.getS3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
      }),
    );

    return {
      key,
      url: this.buildS3Url(key),
    };
  }

  /**
   * Trả về cách để tải file theo key đã lưu (local path để stream, hoặc
   * presigned URL để redirect). Dùng cho endpoint download có kiểm tra quyền
   * — không lộ URL storage thật (S3 bucket có thể để private).
   */
  async getAccessTarget(key: string): Promise<AccessTarget> {
    if (this.driver === 's3') {
      const url = await getSignedUrl(
        this.getS3Client(),
        new GetObjectCommand({ Bucket: this.s3Options.bucket, Key: key }),
        { expiresIn: 300 },
      );
      return { type: 'redirect', url };
    }

    return {
      type: 'local',
      absolutePath: join(process.cwd(), this.uploadDir, key),
    };
  }

  private getS3Client(): S3Client {
    if (!this.s3Client) {
      const { region, endpoint, forcePathStyle, accessKeyId, secretAccessKey } =
        this.s3Options;
      this.s3Client = new S3Client({
        region,
        endpoint,
        forcePathStyle,
        credentials:
          accessKeyId && secretAccessKey
            ? { accessKeyId, secretAccessKey }
            : undefined,
      });
      this.logger.log(
        `S3 storage initialized (region=${region}, bucket=${this.s3Options.bucket})`,
      );
    }
    return this.s3Client;
  }

  private buildS3Url(key: string): string {
    const { publicUrl, endpoint, forcePathStyle, bucket, region } =
      this.s3Options;

    if (publicUrl) {
      return `${publicUrl.replace(/\/+$/, '')}/${key}`;
    }

    if (endpoint) {
      const base = endpoint.replace(/\/+$/, '');
      return forcePathStyle ? `${base}/${bucket}/${key}` : `${base}/${key}`;
    }

    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
