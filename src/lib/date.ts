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
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDateTime(d?: Date | string | number | null) {
  if (!d) return '-';
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '-';
  return formatDateTimeFn(date);
}

// ─── Singapore-Time (SGT, UTC+8) helpers ─────────────────────────────────────
// Course-run datetimes are stored as proper UTC representing Singapore time
// (e.g. 9:00 AM SGT → T01:00:00Z). Use these helpers so all display and form
// values always reflect Singapore time, regardless of the browser's locale.

/**
 * Format a datetime as a date string in Singapore Time (dd/mm/yyyy).
 * Returns `"-"` for null/undefined/invalid input.
 * @param options  Intl.DateTimeFormatOptions — defaults to DD/MM/YYYY
 */
export function formatDateSGT(
  d?: Date | string | number | null,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!d) return '-';
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '-';
  if (options && Object.keys(options).length > 0) {
    return date.toLocaleDateString('en-GB', { timeZone: 'Asia/Singapore', ...options });
  }
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const year = parts.find((p) => p.type === 'year')?.value || '1970';
  return `${day}/${month}/${year}`;
}

/**
 * Format a datetime as a time string (HH:MM, 24-hour) in Singapore Time.
 * Returns `"-"` for null/undefined/invalid input.
 */
export function formatTimeSGT(d?: Date | string | number | null): string {
  if (!d) return '-';
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Format a datetime as "DD/MM/YYYY HH:MM" in Singapore Time.
 * Returns `"-"` for null/undefined/invalid input.
 */
export function formatDateTimeSGT(d?: Date | string | number | null): string {
  if (!d) return '-';
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '-';
  return `${formatDateSGT(date)} ${formatTimeSGT(date)}`;
}

/**
 * Extract the Singapore-Time date portion as YYYY-MM-DD,
 * suitable for `<input type="date">` value attributes.
 */
export function toSGTDateInputValue(d?: Date | string | number | null): string {
  if (!d) return '';
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  // Format in SGT, then re-parse to YYYY-MM-DD
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore' }).format(date); // yields YYYY-MM-DD
  return parts;
}

/**
 * Extract the Singapore-Time time portion as HH:MM,
 * suitable for `<input type="time">` value attributes.
 */
export function toSGTTimeInputValue(d?: Date | string | number | null): string {
  if (!d) return '';
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Build a UTC datetime from a YYYY-MM-DD date string and HH:MM time string,
 * treating both values as Singapore Time (UTC+8).
 * Returns ISO UTC string. E.g. ("2025-01-15", "09:00") → "2025-01-14T01:00:00.000Z" is WRONG;
 * actually ("2025-01-15", "09:00") → T01:00:00Z (9 AM SGT = 1 AM UTC).
 */
export function buildSGTDatetime(dateStr: string, timeStr: string): string | null {
  if (!dateStr || !timeStr) return null;
  // Append SGT offset; JS will convert to UTC internally
  const combined = `${dateStr}T${timeStr}:00+08:00`;
  const d = new Date(combined);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ── Legacy aliases (kept for backward compat, map to SGT equivalents) ─────────
/** @deprecated Use formatDateSGT */
export const formatDateUTC = formatDateSGT;
/** @deprecated Use formatTimeSGT */
export const formatTimeUTC = formatTimeSGT;
/** @deprecated Use formatDateTimeSGT */
export const formatDateTimeUTC = formatDateTimeSGT;
/** @deprecated Use toSGTDateInputValue */
export const toUTCDateInputValue = toSGTDateInputValue;
/** @deprecated Use toSGTTimeInputValue */
export const toUTCTimeInputValue = toSGTTimeInputValue;
/** @deprecated Use buildSGTDatetime */
export const buildUTCDatetime = buildSGTDatetime;
