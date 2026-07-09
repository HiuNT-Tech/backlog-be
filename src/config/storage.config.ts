import { registerAs } from '@nestjs/config';

/**
 * Cấu hình lưu trữ file đính kèm.
 *
 * - `driver = 'local'` (mặc định): ghi ra ổ đĩa, serve qua `/uploads`.
 * - `driver = 's3'`: upload lên S3 / S3-compatible (MinIO, R2, ...).
 *   Chỉ cần đổi env, không phải sửa code.
 */
export const storageConfig = registerAs('storage', () => ({
  driver: (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 's3',

  // Local driver
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  uploadBaseUrl:
    process.env.UPLOAD_BASE_URL?.trim() ||
    `http://localhost:${Number(process.env.PORT ?? 3000)}/uploads`,

  // S3 driver
  s3: {
    region: process.env.S3_REGION ?? 'ap-southeast-1',
    bucket: process.env.S3_BUCKET ?? '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    // Tuỳ chọn: endpoint riêng cho MinIO / Cloudflare R2 / ...
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    // MinIO / một số S3-compatible cần path-style
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    // Prefix key trong bucket (vd: 'attachments')
    keyPrefix: process.env.S3_KEY_PREFIX ?? 'attachments',
    // URL công khai để build link tải file. Nếu để trống sẽ tự suy ra
    // từ region/bucket (hoặc endpoint nếu có).
    publicUrl: process.env.S3_PUBLIC_URL?.trim() || undefined,
  },
}));
