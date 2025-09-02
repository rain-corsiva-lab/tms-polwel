import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateDDMMYYYY(dateLike?: string | Date | null) {
  if (!dateLike) return "";
  const d = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  if (Number.isNaN(d.getTime())) return "";
  const day = `${d.getDate()}`.padStart(2, "0");
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function parseDDMMYYYYToISO(value?: string | null) {
  if (!value) return null;
  const s = value.trim();
  if (!s) return null;
  // Accept separators like / or - or . or space
  const parts = s.split(/[^0-9]+/).filter(Boolean);
  if (parts.length !== 3) return null;
  let [d, m, y] = parts;
  // normalize year
  if (y.length === 2) {
    const yy = parseInt(y, 10);
    y = yy >= 70 ? `19${y}` : `20${y}`;
  }
  const day = parseInt(d, 10);
  const month = parseInt(m, 10);
  const yearNum = parseInt(y, 10);
  if (!day || !month || !yearNum) return null;
  // Basic validation
  if (month < 1 || month > 12) return null;
  const maxDays = new Date(yearNum, month, 0).getDate();
  if (day < 1 || day > maxDays) return null;
  const mm = `${month}`.padStart(2, "0");
  const dd = `${day}`.padStart(2, "0");
  return `${yearNum}-${mm}-${dd}`;
}
