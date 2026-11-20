import type { ScheduleDefinition } from '../types/orchestrator';

export interface ParsedCron {
  minutes: number[];
  hours: number[];
  daysOfMonth: number[];
  months: number[];
  daysOfWeek: number[];
  isValid: boolean;
  isWildcardDom: boolean;
  isWildcardDow: boolean;
}

function parseField(field: string, min: number, max: number): number[] | null {
  const result = new Set<number>();
  const parts = field.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) return null;

    if (trimmed === '*') {
      for (let i = min; i <= max; i++) result.add(i);
      continue;
    }

    if (trimmed.startsWith('*/')) {
      const step = Number(trimmed.slice(2));
      if (!Number.isInteger(step) || step <= 0) return null;
      for (let i = min; i <= max; i += step) result.add(i);
      continue;
    }

    if (trimmed.includes('-')) {
      const [rangePart, stepPart] = trimmed.split('/');
      const [startStr, endStr] = rangePart.split('-');
      const start = Number(startStr);
      const end = Number(endStr);
      const step = stepPart ? Number(stepPart) : 1;
      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        !Number.isInteger(step) ||
        step <= 0 ||
        start < min ||
        end > max ||
        start > end
      ) {
        return null;
      }
      for (let i = start; i <= end; i += step) result.add(i);
      continue;
    }

    const num = Number(trimmed);
    if (!Number.isInteger(num) || num < min || num > max) return null;
    result.add(num);
  }

  return Array.from(result).sort((a, b) => a - b);
}

export function parseCronExpression(expr: string): ParsedCron {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) {
    return {
      minutes: [],
      hours: [],
      daysOfMonth: [],
      months: [],
      daysOfWeek: [],
      isValid: false,
      isWildcardDom: true,
      isWildcardDow: true,
    };
  }

  const [mStr, hStr, domStr, monStr, dowStr] = fields;
  const minutes = parseField(mStr, 0, 59);
  const hours = parseField(hStr, 0, 23);
  const daysOfMonth = parseField(domStr, 1, 31);
  const months = parseField(monStr, 1, 12);
  // Normalize 7 -> 0 for Sunday if present
  const rawDow = parseField(dowStr.replace(/\b7\b/g, '0'), 0, 6);

  if (!minutes || !hours || !daysOfMonth || !months || !rawDow) {
    return {
      minutes: [],
      hours: [],
      daysOfMonth: [],
      months: [],
      daysOfWeek: [],
      isValid: false,
      isWildcardDom: domStr === '*',
      isWildcardDow: dowStr === '*',
    };
  }

  return {
    minutes,
    hours,
    daysOfMonth,
    months,
    daysOfWeek: rawDow,
    isValid: true,
    isWildcardDom: domStr === '*',
    isWildcardDow: dowStr === '*',
  };
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function describeCronExpression(expr: string): string {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return 'Invalid CRON expression';

  const [min, hour, dom, mon, dow] = fields;
  const pad = (n: string) => n.padStart(2, '0');

  if (min.startsWith('*/') && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return `Every ${min.slice(2)} minutes`;
  }
  if (min === '0' && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return 'Every hour on :00';
  }
  if (min === '0' && hour.startsWith('*/') && dom === '*' && mon === '*' && dow === '*') {
    return `Every ${hour.slice(2)} hours`;
  }
  if (/^\d+$/.test(min) && /^\d+$/.test(hour)) {
    const timeLabel = `${pad(hour)}:${pad(min)}`;
    if (dom === '*' && mon === '*' && dow === '*') {
      return `Daily at ${timeLabel}`;
    }
    if (dom === '*' && mon === '*' && dow === '1-5') {
      return `Weekdays at ${timeLabel}`;
    }
    if (dom === '*' && mon === '*' && /^\d+$/.test(dow)) {
      const idx = Number(dow) % 7;
      return `Weekly on ${WEEKDAY_NAMES[idx]} at ${timeLabel}`;
    }
    if (/^\d+$/.test(dom) && mon === '*' && dow === '*') {
      return `Monthly on day ${dom} at ${timeLabel}`;
    }
  }

  return `CRON: ${expr}`;
}

export function doesCronMatchDate(parsed: ParsedCron, date: Date): boolean {
  if (!parsed.isValid) return false;
  const month = date.getMonth() + 1;
  const dom = date.getDate();
  const dow = date.getDay();

  if (!parsed.months.includes(month)) return false;

  const domMatch = parsed.daysOfMonth.includes(dom);
  const dowMatch = parsed.daysOfWeek.includes(dow);

  if (!parsed.isWildcardDom && !parsed.isWildcardDow) {
    return domMatch || dowMatch;
  }
  return domMatch && dowMatch;
}

export interface CalendarScheduleOccurrence {
  schedule: ScheduleDefinition;
  timesLabel: string;
  triggerCountInDay: number;
  sampleTimes: string[];
  humanSummary: string;
}

export function getScheduleOccurrencesForDate(
  schedules: ScheduleDefinition[],
  date: Date
): CalendarScheduleOccurrence[] {
  const occurrences: CalendarScheduleOccurrence[] = [];

  for (const schedule of schedules) {
    const parsed = parseCronExpression(schedule.cronExpression);
    if (!doesCronMatchDate(parsed, date)) continue;

    const triggerCountInDay = parsed.hours.length * parsed.minutes.length;
    const sampleTimes: string[] = [];

    for (const h of parsed.hours) {
      for (const m of parsed.minutes) {
        if (sampleTimes.length < 6) {
          sampleTimes.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
      }
    }

    let timesLabel = sampleTimes[0] ?? '00:00';
    if (triggerCountInDay > 12) {
      timesLabel = `${triggerCountInDay}x / day`;
    } else if (triggerCountInDay > 1) {
      timesLabel = `${sampleTimes[0]} (${triggerCountInDay}x)`;
    }

    occurrences.push({
      schedule,
      timesLabel,
      triggerCountInDay,
      sampleTimes,
      humanSummary: describeCronExpression(schedule.cronExpression),
    });
  }

  return occurrences.sort((a, b) => {
    if (a.schedule.enabled !== b.schedule.enabled) return a.schedule.enabled ? -1 : 1;
    return (a.sampleTimes[0] ?? '').localeCompare(b.sampleTimes[0] ?? '');
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCalendarMonthGrid(anchorDate: Date): Date[] {
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
  const gridStart = new Date(year, month, 1 - startOffset);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }
  return days;
}

export function getCalendarWeekDays(anchorDate: Date): Date[] {
  const startOffset = anchorDate.getDay();
  const weekStart = new Date(
    anchorDate.getFullYear(),
    anchorDate.getMonth(),
    anchorDate.getDate() - startOffset
  );
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));
  }
  return days;
}
