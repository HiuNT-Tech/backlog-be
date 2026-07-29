export const toIsoString = (date: Date = new Date()): string => {
  return date.toISOString();
};

/**
 * Ngày cách hôm nay `days` ngày, chuẩn hoá về 00:00 UTC — dùng cho các field
 * Prisma khai báo `@db.Date` (chỉ lưu ngày, không lưu giờ). `days` âm trả về
 * ngày trong quá khứ.
 */
export const addDaysToToday = (days: number): Date => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};
