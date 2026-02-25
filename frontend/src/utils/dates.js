import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export function getWeekStart(date = new Date()) {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function getWeekDays(weekStart) {
  const start = new Date(weekStart + 'T00:00:00');
  return DAYS.map((name, i) => ({
    name,
    short: name.slice(0, 3),
    date: format(addDays(start, i), 'MMM d'),
    key: name,
  }));
}

export function nextWeek(weekStart) {
  return format(addWeeks(new Date(weekStart + 'T00:00:00'), 1), 'yyyy-MM-dd');
}

export function prevWeek(weekStart) {
  return format(subWeeks(new Date(weekStart + 'T00:00:00'), 1), 'yyyy-MM-dd');
}

export function formatWeekRange(weekStart) {
  const start = new Date(weekStart + 'T00:00:00');
  const end = addDays(start, 4);
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
}
