/**
 * Chuẩn hoá field mảng số gửi qua multipart/form-data cho `removeAttachmentIds`.
 * FE có thể gửi lặp `removeAttachmentIds=1&removeAttachmentIds=2` (=> string[])
 * hoặc một giá trị đơn (=> string).
 */
export const toIntArrayTransform = ({
  value,
}: {
  value: unknown;
}): number[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item));
};
