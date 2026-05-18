// Central date utilities
// Uses date-fns if available for consistent formatting, otherwise falls back to Intl

let formatFn: (d: Date | string | number, fmt?: string) => string;
let formatDateTimeFn: (d: Date | string | number, fmt?: string) => string;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { format } = require('date-fns');
  formatFn = (d) => {
    const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    return format(date, 'dd/MM/yyyy');
  };
  formatDateTimeFn = (d) => {
    const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    return format(date, 'dd/MM/yyyy HH:mm');
  };
} catch (e) {
  // fallback
  formatFn = (d) => {
    const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    try {
      return new Intl.DateTimeFormat('en-GB').format(date); // en-GB defaults to dd/mm/yyyy order
    } catch (e) {
      // last resort
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  };
  formatDateTimeFn = (d) => {
    const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    try {
      return new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date).replace(/,/, '');
    } catch (e) {
      // last resort
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    }
  };
}

export function formatDate(d?: Date | string | number | null) {
  if (!d) return '-';
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '-';
  return formatFn(date);
}

export function formatDateTime(d?: Date | string | number | null) {
  if (!d) return '-';
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '-';
  return formatDateTimeFn(date);
}

// ─── UTC-aware helpers ────────────────────────────────────────────────────────
// Course-run datetimes are stored as wall-clock UTC (e.g. T08:00:00Z means 8 AM
// everywhere). Use these helpers to display the literal UTC value regardless of
// the browser's local timezone.

/**
 * Format a datetime as a date string interpreted in UTC.
 * Returns `"-"` for null/undefined/invalid input.
 * @param options  Intl.DateTimeFormatOptions — defaults to `{ day:'2-digit', month:'2-digit', year:'numeric' }` (DD/MM/YYYY)
 */
export function formatDateUTC(
  d?: Date | string | number | null,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  if (!d) return '-';
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { timeZone: 'UTC', ...options });
}

/**
 * Format a datetime as a time string (HH:MM, 24-hour) interpreted in UTC.
 * Returns `"-"` for null/undefined/invalid input.
 */
export function formatTimeUTC(d?: Date | string | number | null): string {
  if (!d) return '-';
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Format a datetime as "DD/MM/YYYY HH:MM" interpreted in UTC.
 * Returns `"-"` for null/undefined/invalid input.
 */
export function formatDateTimeUTC(d?: Date | string | number | null): string {
  if (!d) return '-';
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '-';
  return `${formatDateUTC(date)} ${formatTimeUTC(date)}`;
}

/**
 * Extract the UTC date portion of a datetime as a YYYY-MM-DD string,
 * suitable for `<input type="date">` value attributes.
 */
export function toUTCDateInputValue(d?: Date | string | number | null): string {
  if (!d) return '';
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/**
 * Extract the UTC time portion of a datetime as a HH:MM string,
 * suitable for `<input type="time">` value attributes.
 */
export function toUTCTimeInputValue(d?: Date | string | number | null): string {
  if (!d) return '';
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const h = String(date.getUTCHours()).padStart(2, '0');
  const m = String(date.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Build a UTC datetime from a YYYY-MM-DD date string and HH:MM time string.
 * Returns ISO string. The time is treated as UTC wall-clock time.
 */
export function buildUTCDatetime(dateStr: string, timeStr: string): string | null {
  if (!dateStr || !timeStr) return null;
  const combined = `${dateStr}T${timeStr}:00Z`;
  const d = new Date(combined);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
