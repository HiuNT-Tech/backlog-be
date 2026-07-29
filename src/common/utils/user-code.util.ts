/**
 * Mã người dùng công khai (`users.user_code`) — dùng để tìm/mời thành viên mà
 * không cần chia sẻ email.
 *
 * Sinh trực tiếp từ `users.id` nên **không bao giờ trùng** và không cần vòng
 * lặp thử lại; đổi lại chỉ biết được mã sau khi đã insert (xem
 * `UsersRepository.createUser`).
 */
export const USER_CODE_PREFIX = 'U-';
export const USER_CODE_DIGITS = 6;

/**
 * Pad tới 6 chữ số cho dễ đọc. Id vượt 999999 thì mã dài ra thay vì bị cắt —
 * `padStart` không làm ngắn chuỗi, nên mã vẫn đúng và vẫn duy nhất.
 */
export const buildUserCode = (userId: number): string =>
  `${USER_CODE_PREFIX}${String(userId).padStart(USER_CODE_DIGITS, '0')}`;
