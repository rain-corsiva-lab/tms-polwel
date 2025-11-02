import { Prisma } from '@prisma/client';

/**
 * Convert Prisma Decimal to number
 */
export const toNumber = (value: Prisma.Decimal | number | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof (value as any).toNumber === 'function') {
    return (value as any).toNumber();
  }
  return Number(value);
};

/**
 * Recursively convert all Decimal fields in an object to numbers
 */
export const convertDecimalsToNumbers = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj;
  }

  if (typeof (obj as any).toNumber === 'function') {
    // This is a Prisma Decimal
    return toNumber(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(convertDecimalsToNumbers);
  }

  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        converted[key] = convertDecimalsToNumbers(obj[key]);
      }
    }
    return converted;
  }

  return obj;
};
