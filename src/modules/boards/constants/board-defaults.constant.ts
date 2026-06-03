import { StatusColor } from '@common/types';

export const DEFAULT_COLUMNS = [
  { title: 'To Do', statusColor: StatusColor.BLUE, position: 0 },
  { title: 'In Progress', statusColor: StatusColor.GREEN, position: 1 },
  { title: 'Resolved', statusColor: StatusColor.TEAL, position: 2 },
  { title: 'Closed', statusColor: StatusColor.BLACK, position: 3 },
] as const;
