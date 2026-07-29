import { StatusColor } from '@common/types';
import { Priority } from '@common/enums/priority.enum';

/**
 * Nội dung của "project mẫu" — board demo tạo bằng 1 cú bấm ở dashboard, giúp
 * người dùng chưa quen tool nhìn thấy ngay một dự án thật trông như thế nào:
 * cột nào, loại issue nào, milestone ra sao, ticket được viết thế nào.
 *
 * Cột dùng lại `DEFAULT_COLUMNS` (giống board tạo thường) để người dùng học
 * đúng cấu trúc mặc định của app, không phải một cấu trúc riêng chỉ có ở đây.
 *
 * Chỉ phần chữ mà người dùng đọc (tiêu đề/mô tả card, mô tả milestone) mới đa
 * ngữ. Tên cột và tên loại issue giữ nguyên tiếng Anh — đó là quy ước chung của
 * app (và của Backlog gốc: Bug/Task/Request/Misc), không nên dịch.
 */

export const SAMPLE_BOARD_LOCALES = ['vi', 'en'] as const;

export type SampleBoardLocale = (typeof SAMPLE_BOARD_LOCALES)[number];

export const DEFAULT_SAMPLE_BOARD_LOCALE: SampleBoardLocale = 'en';

type LocalizedText = Record<SampleBoardLocale, string>;

type SampleCard = {
  /** Chỉ số trong `DEFAULT_COLUMNS`: 0=To Do, 1=In Progress, 2=Resolved, 3=Closed. */
  columnIndex: number;
  /** Chỉ số trong `SAMPLE_BOARD_ISSUE_TYPES`. */
  issueTypeIndex: number;
  /** Chỉ số trong `SAMPLE_BOARD_VERSIONS`. */
  versionIndex: number;
  priority: Priority;
  /** Số ngày từ hôm nay tới hạn. Số âm = đã quá hạn (để demo cảnh báo overdue). */
  dueInDays?: number;
  estimatedHours?: string;
  actualHours?: string;
  /** Gán cho người tạo project mẫu, để họ thấy ngay filter "việc của tôi" hoạt động. */
  assignToCreator?: boolean;
  title: LocalizedText;
  description: LocalizedText;
};

export const SAMPLE_BOARD_DESCRIPTION: LocalizedText = {
  vi: 'Project mẫu để làm quen với cách tổ chức công việc: cột, loại issue, milestone và ticket.',
  en: 'Sample project showing how work is organised: columns, issue types, milestones and tickets.',
};

export const SAMPLE_BOARD_ISSUE_TYPES = [
  { name: 'Bug', statusColor: StatusColor.BRIGHT_RED },
  { name: 'Task', statusColor: StatusColor.BLUE },
  { name: 'Request', statusColor: StatusColor.GREEN },
  { name: 'Misc', statusColor: StatusColor.INDIGO },
] as const;

export const SAMPLE_BOARD_VERSIONS = [
  {
    name: 'v1.0 - MVP',
    startsInDays: -30,
    endsInDays: 7,
    description: {
      vi: 'Bản chạy được đầu tiên: đăng nhập, xem sản phẩm.',
      en: 'First working release: login and product browsing.',
    },
  },
  {
    name: 'v1.1 - Checkout',
    startsInDays: 7,
    endsInDays: 30,
    description: {
      vi: 'Thanh toán và các cải tiến sau phản hồi người dùng.',
      en: 'Checkout flow plus improvements from user feedback.',
    },
  },
] as const;

/**
 * 10 ticket rải đều 4 cột để board mẫu trông như một dự án đang chạy thật:
 * có việc đã xong, đang làm, còn chờ; có bug, task, request; có việc quá hạn.
 */
export const SAMPLE_BOARD_CARDS: SampleCard[] = [
  // --- Closed: việc đã hoàn thành, có actualHours để demo so sánh với estimate.
  {
    columnIndex: 3,
    issueTypeIndex: 1,
    versionIndex: 0,
    priority: Priority.MEDIUM,
    estimatedHours: '4',
    actualHours: '5',
    title: {
      vi: 'Khởi tạo repository và pipeline CI',
      en: 'Set up repository and CI pipeline',
    },
    description: {
      vi: 'Tạo repo, thêm lint + test tự động chạy mỗi lần push.\n\nHoàn thành khi: pipeline chạy xanh trên nhánh main.',
      en: 'Create the repo and make lint + tests run automatically on every push.\n\nDone when: the pipeline passes on main.',
    },
  },
  {
    columnIndex: 3,
    issueTypeIndex: 1,
    versionIndex: 0,
    priority: Priority.MEDIUM,
    estimatedHours: '8',
    actualHours: '8',
    title: {
      vi: 'Thiết kế wireframe trang chủ',
      en: 'Design the homepage wireframe',
    },
    description: {
      vi: 'Phác thảo bố cục trang chủ trên desktop và mobile để cả nhóm thống nhất trước khi code.',
      en: 'Sketch the desktop and mobile homepage layout so the team agrees before coding starts.',
    },
  },

  // --- Resolved: đã làm xong, đang chờ kiểm tra/nghiệm thu.
  {
    columnIndex: 2,
    issueTypeIndex: 1,
    versionIndex: 0,
    priority: Priority.HIGH,
    estimatedHours: '16',
    actualHours: '14',
    title: {
      vi: 'Xây dựng API đăng nhập',
      en: 'Build the login API',
    },
    description: {
      vi: 'Đăng nhập bằng email + mật khẩu, trả về token.\n\nHoàn thành khi: sai mật khẩu trả lỗi rõ ràng, đăng nhập đúng thì vào được trang chủ.',
      en: 'Log in with email + password and return a token.\n\nDone when: wrong passwords return a clear error and a valid login reaches the homepage.',
    },
  },
  {
    columnIndex: 2,
    issueTypeIndex: 0,
    versionIndex: 0,
    priority: Priority.HIGH,
    estimatedHours: '4',
    actualHours: '3',
    title: {
      vi: 'Nút "Đăng ký" không bấm được trên Safari',
      en: 'Sign-up button does nothing on Safari',
    },
    description: {
      vi: 'Các bước tái hiện:\n1. Mở trang đăng ký bằng Safari\n2. Điền form và bấm "Đăng ký"\n\nKết quả: không có gì xảy ra. Mong đợi: tạo được tài khoản.',
      en: 'Steps to reproduce:\n1. Open the sign-up page in Safari\n2. Fill the form and press "Sign up"\n\nActual: nothing happens. Expected: the account is created.',
    },
  },

  // --- In Progress: đang làm, gán cho người tạo để họ thấy "việc của tôi".
  {
    columnIndex: 1,
    issueTypeIndex: 1,
    versionIndex: 0,
    priority: Priority.HIGH,
    dueInDays: 3,
    estimatedHours: '24',
    assignToCreator: true,
    title: {
      vi: 'Trang danh sách sản phẩm',
      en: 'Product listing page',
    },
    description: {
      vi: 'Hiển thị sản phẩm dạng lưới, có phân trang.\n\nHoàn thành khi: xem được trên cả desktop và mobile, tải dưới 2 giây.',
      en: 'Show products in a grid with pagination.\n\nDone when: it works on desktop and mobile and loads in under 2 seconds.',
    },
  },
  {
    columnIndex: 1,
    issueTypeIndex: 0,
    versionIndex: 0,
    priority: Priority.MEDIUM,
    dueInDays: 2,
    estimatedHours: '6',
    assignToCreator: true,
    title: {
      vi: 'Ảnh sản phẩm bị méo trên mobile',
      en: 'Product images look stretched on mobile',
    },
    description: {
      vi: 'Ảnh dọc bị kéo giãn khi màn hình hẹp hơn 480px. Cần giữ đúng tỉ lệ ảnh.',
      en: 'Portrait images stretch on screens narrower than 480px. They should keep their aspect ratio.',
    },
  },
  {
    columnIndex: 1,
    issueTypeIndex: 2,
    versionIndex: 1,
    priority: Priority.LOW,
    dueInDays: 10,
    estimatedHours: '8',
    title: {
      vi: 'Khách hàng muốn lọc sản phẩm theo khoảng giá',
      en: 'Customer asks for a price range filter',
    },
    description: {
      vi: 'Yêu cầu từ buổi demo ngày thứ Ba. Cần xác nhận lại: lọc theo khoảng giá cố định hay cho người dùng tự nhập?',
      en: "Raised at Tuesday's demo. Needs confirmation: fixed price brackets, or a range the user types in?",
    },
  },

  // --- To Do: việc chưa bắt đầu, gồm 1 ticket đã quá hạn để demo cảnh báo.
  {
    columnIndex: 0,
    issueTypeIndex: 0,
    versionIndex: 0,
    priority: Priority.HIGH,
    dueInDays: -2,
    estimatedHours: '4',
    assignToCreator: true,
    title: {
      vi: 'Email xác nhận đơn hàng không được gửi',
      en: 'Order confirmation email is never sent',
    },
    description: {
      vi: 'Khách đặt hàng thành công nhưng không nhận được email. Ticket này đã quá hạn — board sẽ tô đỏ ngày hết hạn để nhắc.',
      en: 'Orders succeed but no email arrives. This ticket is past its due date — the board highlights it in red as a reminder.',
    },
  },
  {
    columnIndex: 0,
    issueTypeIndex: 1,
    versionIndex: 1,
    priority: Priority.HIGH,
    dueInDays: 14,
    estimatedHours: '40',
    title: {
      vi: 'Tích hợp cổng thanh toán',
      en: 'Integrate the payment gateway',
    },
    description: {
      vi: 'Cho phép thanh toán bằng thẻ.\n\nHoàn thành khi: thanh toán thử thành công ở môi trường test và đơn hàng được ghi nhận.',
      en: 'Let customers pay by card.\n\nDone when: a test payment succeeds and the order is recorded.',
    },
  },
  {
    columnIndex: 0,
    issueTypeIndex: 3,
    versionIndex: 1,
    priority: Priority.LOW,
    dueInDays: 21,
    estimatedHours: '12',
    title: {
      vi: 'Viết tài liệu hướng dẫn sử dụng',
      en: 'Write the user guide',
    },
    description: {
      vi: 'Hướng dẫn ngắn cho người dùng cuối: đặt hàng, theo dõi đơn, đổi mật khẩu.',
      en: 'A short guide for end users: placing an order, tracking it, changing a password.',
    },
  },
];
