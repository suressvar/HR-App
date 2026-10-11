import type { TaskItem } from '../types/models';

export const DAYS_OF_WEEK = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

export const DAY_INDEX_MAP: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

/**
 * Checks whether a task should appear in the "10 Points" sheet.
 * Rules:
 * 1. Explicitly categorized as TEN_POINTS
 * 2. DAILY repeat frequency: comes in 10 points every day
 * 3. WEEKLY repeat frequency: comes in 10 points on the configured repeat day of each week
 * 4. YEARLY repeat frequency: comes in 10 points on the day before the date it was assigned/created
 */
export function isTaskInTenPoints(task: TaskItem, today: Date = new Date()): boolean {
  if (task.classification === 'TEN_POINTS') {
    return true;
  }

  const freq = task.frequency;

  if (freq === 'DAILY') {
    return true;
  }

  if (freq === 'WEEKLY') {
    const todayDayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ...
    let targetDayIndex: number | undefined;

    if (task.repeatDay) {
      const normalized = task.repeatDay.toUpperCase().trim();
      if (DAY_INDEX_MAP[normalized] !== undefined) {
        targetDayIndex = DAY_INDEX_MAP[normalized];
      } else if (!isNaN(Number(task.repeatDay))) {
        targetDayIndex = Number(task.repeatDay);
      }
    }

    // Default fallback to dueDate or createdAt day of week
    if (targetDayIndex === undefined) {
      const refDate = task.dueDate ? new Date(task.dueDate) : new Date(task.createdAt);
      targetDayIndex = refDate.getDay();
    }

    return todayDayOfWeek === targetDayIndex;
  }

  if (freq === 'YEARLY') {
    const assignedDate = task.createdAt
      ? new Date(task.createdAt)
      : task.dueDate
      ? new Date(task.dueDate)
      : new Date();

    const dayBefore = new Date(assignedDate);
    dayBefore.setDate(dayBefore.getDate() - 1);

    return (
      today.getMonth() === dayBefore.getMonth() &&
      today.getDate() === dayBefore.getDate()
    );
  }

  return false;
}

/**
 * Checks whether a task belongs to the "Pending" sheet.
 */
export function isTaskInPending(task: TaskItem): boolean {
  return task.classification === 'PENDING';
}

/**
 * Gets a clean human-readable label for repeat frequency, including repeat day if weekly.
 */
export function formatFrequency(frequency?: string, repeatDay?: string | null): string {
  if (!frequency || frequency === 'ONE_TIME') return 'One-Time';
  if (frequency === 'DAILY') return 'Daily (10 Points Daily)';
  if (frequency === 'WEEKLY') {
    const dayLabel = repeatDay ? repeatDay.charAt(0) + repeatDay.slice(1).toLowerCase() : 'Scheduled Day';
    return `Weekly (${dayLabel})`;
  }
  if (frequency === 'YEARLY') return 'Yearly (1 Day Before)';
  if (frequency === 'MONTHLY') return 'Monthly';
  return frequency;
}
