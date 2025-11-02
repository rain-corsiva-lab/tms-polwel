import { Decimal } from '@prisma/client/runtime/library';

/**
 * Convert Prisma Decimal fields to numbers recursively
 * This handles serialization of Decimal types which cannot be directly JSON stringified
 */
export const convertDecimalToNumber = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Decimal) {
    return Number(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertDecimalToNumber(item));
  }

  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        converted[key] = convertDecimalToNumber(obj[key]);
      }
    }
    return converted;
  }

  return obj;
};

/**
 * Specifically convert known Decimal fields in CourseRun object
 */
export const convertCourseRunDecimals = (courseRun: any): any => {
  if (!courseRun) return courseRun;

  return {
    ...courseRun,
    venueFee: courseRun.venueFee ? Number(courseRun.venueFee) : courseRun.venueFee,
    venueFinalFee: courseRun.venueFinalFee ? Number(courseRun.venueFinalFee) : courseRun.venueFinalFee,
    perHeadFeeIfMaxExceed: courseRun.perHeadFeeIfMaxExceed ? Number(courseRun.perHeadFeeIfMaxExceed) : courseRun.perHeadFeeIfMaxExceed,
    venuePerHeadIfExceed: courseRun.venuePerHeadIfExceed ? Number(courseRun.venuePerHeadIfExceed) : courseRun.venuePerHeadIfExceed,
    contractFees: courseRun.contractFees ? Number(courseRun.contractFees) : courseRun.contractFees,
    adminFee: courseRun.adminFee ? Number(courseRun.adminFee) : courseRun.adminFee,
    baseCourseFee: courseRun.baseCourseFee ? Number(courseRun.baseCourseFee) : courseRun.baseCourseFee,
    contingencyFee: courseRun.contingencyFee ? Number(courseRun.contingencyFee) : courseRun.contingencyFee,
    otherFee: courseRun.otherFee ? Number(courseRun.otherFee) : courseRun.otherFee,
  };
};
