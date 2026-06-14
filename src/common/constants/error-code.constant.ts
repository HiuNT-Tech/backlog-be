import { ErrorCode } from '@common/exceptions/error-code';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // User
  [ErrorCode.USER_NOT_FOUND]: 'User not found',
  [ErrorCode.USER_EMAIL_EXISTS]: 'Email already exists',
  [ErrorCode.USER_ALREADY_VERIFIED]: 'User already verified',
  [ErrorCode.USER_INACTIVE]: 'User account is inactive',

  // Auth
  [ErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ErrorCode.INVALID_TOKEN]: 'Invalid or expired token',
  [ErrorCode.INVALID_VERIFICATION_TOKEN]: 'Invalid verification token',
  [ErrorCode.VERIFICATION_TOKEN_MISSING]: 'Verification token is missing',
  [ErrorCode.EMAIL_SERVICE_UNAVAILABLE]: 'Email service is unavailable',
  [ErrorCode.INVALID_RESET_TOKEN]: 'Invalid password reset token',
  [ErrorCode.RESET_TOKEN_EXPIRED]: 'Password reset token has expired',

  // General
  [ErrorCode.FORBIDDEN_RESOURCE]: 'Forbidden resource',

  // Board
  [ErrorCode.BOARD_TYPE_INVALID]: 'Invalid board type',
  [ErrorCode.BOARD_NOT_FOUND]: 'Board not found',
  [ErrorCode.BOARD_CODE_EXISTS]: 'Board code already exists',
  [ErrorCode.BOARD_CODE_UPDATE_FORBIDDEN]:
    'Cannot update board code after cards have been created',
  [ErrorCode.NOT_BOARD_MEMBER]: 'Current user is not a board member',
  [ErrorCode.INSUFFICIENT_BOARD_PERMISSION]:
    'Current user does not have permission',
  [ErrorCode.COLUMNS_NOT_BELONG_TO_BOARD]:
    'All columns must belong to the board',
  [ErrorCode.BOARD_MEMBER_NOT_FOUND]: 'Board member not found',
  [ErrorCode.CANNOT_REMOVE_LAST_ADMIN]:
    'Cannot remove or demote the last admin of the board',

  // Card
  [ErrorCode.CARD_NOT_FOUND]: 'Card not found',
  [ErrorCode.ASSIGNEE_NOT_BOARD_MEMBER]: 'Assignee is not a board member',
  [ErrorCode.INVALID_DATE_RANGE]: 'Start date must be before or equal end date',
  [ErrorCode.MOVE_CARD_MISSING_CURRENT]: 'nextCards must include currentCardId',
  [ErrorCode.MOVE_CARD_INVALID_PREV]:
    'prevCards must not include currentCardId',
  [ErrorCode.MOVE_CARD_DUPLICATE_IDS]:
    'Move card payload contains duplicate ids',
  [ErrorCode.MOVE_CARD_PREV_MISMATCH]:
    'All previous cards must belong to previous column',
  [ErrorCode.MOVE_CARD_NEXT_MISMATCH]:
    'All next cards must belong to next column or be the current card',
  [ErrorCode.MOVE_CARD_WRONG_COLUMN]: 'Current card is not in previous column',

  // Column
  [ErrorCode.COLUMN_NOT_FOUND]: 'Column not found',
  [ErrorCode.CARDS_NOT_BELONG_TO_COLUMN]: 'All cards must belong to the column',

  // Version
  [ErrorCode.VERSION_NOT_FOUND]: 'Version not found',

  // Issue Type
  [ErrorCode.ISSUE_TYPE_NOT_FOUND]: 'Issue type not found',
  [ErrorCode.ISSUE_TYPE_NAME_EXISTS]: 'Issue type name already exists',

  // Upload
  [ErrorCode.FILE_REQUIRED]: 'File is required',
  [ErrorCode.FILE_TOO_LARGE]: 'File size exceeds the allowed limit',
  [ErrorCode.FILE_TYPE_UNSUPPORTED]: 'Unsupported file type',
  [ErrorCode.FILE_MAX_COUNT_EXCEEDED]: 'Maximum file count exceeded',

  // Me / Profile
  [ErrorCode.INVALID_CURRENT_PASSWORD]: 'Current password is incorrect',

  // Board Invitation
  [ErrorCode.INVITATION_NOT_FOUND]: 'Invitation not found',
  [ErrorCode.INVITATION_EXPIRED]: 'Invitation has expired',
  [ErrorCode.INVITATION_ALREADY_RESPONDED]:
    'Invitation has already been responded to',
  [ErrorCode.INVITATION_EMAIL_MISMATCH]:
    'Invitation email does not match current user',
  [ErrorCode.INVITATION_ALREADY_PENDING]:
    'A pending invitation already exists for this board and email',
  [ErrorCode.USER_ALREADY_MEMBER]: 'User is already a board member',
};
