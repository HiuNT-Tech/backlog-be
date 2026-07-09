import {
  DOCUMENT_MIME_TYPES,
  IMAGE_MIME_TYPES,
} from '@common/upload';

/**
 * Định dạng file cho phép đính kèm (comment / ticket).
 * Khớp với danh sách phía FE trong `attachment-uploader.tsx`.
 */
export const ATTACHMENT_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  'image/svg+xml',
  ...DOCUMENT_MIME_TYPES,
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
] as const;

export const ATTACHMENT_MAX_FILES = 10;
export const ATTACHMENT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
