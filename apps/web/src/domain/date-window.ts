export interface DateWindow {
  startInclusive: string;
  endExclusive: string;
  timeZone: string;
}

interface LocalDate {
  year: number;
  month: number;
  day: number;
}

function localDate(date: Date, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read('year'), month: read('month'), day: read('day') };
}

function lastDay(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonths(date: LocalDate, delta: number): LocalDate {
  const index = date.month - 1 + delta;
  const year = date.year + Math.floor(index / 12);
  const month = ((index % 12) + 12) % 12;
  const day = Math.min(date.day, lastDay(year, month + 1));
  return { year, month: month + 1, day };
}

function addDays(date: LocalDate, delta: number): LocalDate {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day + delta));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

function offsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcMs));
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const hour = read('hour') === 24 ? 0 : read('hour');
  const asUtc = Date.UTC(read('year'), read('month') - 1, read('day'), hour, read('minute'), read('second'));
  return asUtc - utcMs;
}

export function zonedLocalToUtc(year: number, month: number, day: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0);
  let utc = guess;
  for (let attempt = 0; attempt < 3; attempt += 1) utc = guess - offsetMs(utc, timeZone);
  return new Date(utc);
}

export function sixCalendarMonths(now: Date, timeZone: string): DateWindow {
  const today = localDate(now, timeZone);
  const start = addMonths(today, -6);
  const end = addDays(today, 1);
  return {
    startInclusive: zonedLocalToUtc(start.year, start.month, start.day, timeZone).toISOString(),
    endExclusive: zonedLocalToUtc(end.year, end.month, end.day, timeZone).toISOString(),
    timeZone,
  };
}

export function messageWindowRelation(sentAt: string | null, window: DateWindow): 'inside' | 'before' | 'after' | 'unknown' {
  if (!sentAt) return 'unknown';
  const at = Date.parse(sentAt);
  if (Number.isNaN(at)) return 'unknown';
  if (at < Date.parse(window.startInclusive)) return 'before';
  if (at >= Date.parse(window.endExclusive)) return 'after';
  return 'inside';
}
