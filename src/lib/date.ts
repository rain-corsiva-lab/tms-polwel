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
