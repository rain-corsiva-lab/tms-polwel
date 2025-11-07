import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../lib/prisma";
import { toNumber } from "../lib/decimal-converter";

// ============== CONTROLLERS ==============

export const billingReportsController = {
  /**
   * GET /api/billing-reports
   * Get all billing reports with optional filters
   */
  async getBillingReports(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { search, startMonth, endMonth } = req.query;

      const whereClause: any = {
        deletedAt: null,
      };

      // Filter by search query (search in billing month)
      if (search && typeof search === 'string') {
        whereClause.billingMonth = {
          contains: search,
        };
      }

      // Fetch all billing reports (we'll filter by date range in memory)
      let billingReports = await prisma.billingReport.findMany({
        where: whereClause,
        include: {
          courseRunBillings: {
            include: {
              courseRun: {
                include: {
                  course: true,
                  courseRunLearners: true,
                  courseRunTrainers: {
                    where: { deletedAt: null },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Helper function to convert "MonthName YYYY" to Date object for comparison
      const parseMonthString = (monthStr: string): Date | null => {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const parts = monthStr.split(' ');
        if (parts.length !== 2) return null;
        
        const monthName = parts[0] || '';
        const yearStr = parts[1] || '';
        const year = parseInt(yearStr, 10);
        const monthIndex = monthNames.indexOf(monthName);
        
        if (monthIndex === -1 || isNaN(year)) return null;
        
        return new Date(year, monthIndex, 1);
      };

      // Filter by month range in memory (proper date comparison)
      if (startMonth && typeof startMonth === 'string') {
        const parts = startMonth.split('-').map(Number);
        const startYear = parts[0];
        const startMonthNum = parts[1];
        
        if (startYear && startMonthNum) {
          billingReports = billingReports.filter(report => {
            const reportDate = parseMonthString(report.billingMonth);
            if (!reportDate) return false;
            
            const reportYear = reportDate.getFullYear();
            const reportMonth = reportDate.getMonth(); // 0-indexed
            
            // Compare year first, then month
            if (reportYear > startYear) return true;
            if (reportYear < startYear) return false;
            return reportMonth >= (startMonthNum - 1); // startMonthNum is 1-indexed, convert to 0-indexed
          });
        }
      }

      if (endMonth && typeof endMonth === 'string') {
        const parts = endMonth.split('-').map(Number);
        const endYear = parts[0];
        const endMonthNum = parts[1];
        
        if (endYear && endMonthNum) {
          billingReports = billingReports.filter(report => {
            const reportDate = parseMonthString(report.billingMonth);
            if (!reportDate) return false;
            
            const reportYear = reportDate.getFullYear();
            const reportMonth = reportDate.getMonth(); // 0-indexed
            
            // Compare year first, then month
            if (reportYear < endYear) return true;
            if (reportYear > endYear) return false;
            return reportMonth <= (endMonthNum - 1); // endMonthNum is 1-indexed, convert to 0-indexed
          });
        }
      }

      // Format the response with dynamically computed totals
      const formatted = billingReports.map((report: any) => {
        // Compute totals from courseRunBillings relations
        const totalCourseRuns = report.courseRunBillings.length;
        let totalParticipants = 0;
        let contractFees = 0;
        let venueFees = 0;
        let totalTrainerFees = 0;
        let totalAdditionalFees = 0;

        report.courseRunBillings.forEach((billing: any) => {
          // Sum participants
          totalParticipants += billing.courseRun?.courseRunLearners?.length || 0;
          
          // Sum fees
          contractFees += toNumber(billing.contractInvoiceAmount) ?? 0;
          venueFees += toNumber(billing.venueInvoiceAmount) ?? 0;

          // Sum trainer fees (trainerBaseAmount + additionalCost)
          const courseRunTrainers = billing.courseRun?.courseRunTrainers || [];
          courseRunTrainers.forEach((trainer: any) => {
            const baseAmount = toNumber(trainer.trainerBaseAmount) ?? 0;
            const additionalCost = toNumber(trainer.additionalCost) ?? 0;
            totalTrainerFees += baseAmount + additionalCost;
          });

          // Sum additional fees (contingencyFee + adminFee + otherFee)
          const contingencyFee = toNumber(billing.courseRun?.contingencyFee) ?? 0;
          const adminFee = toNumber(billing.courseRun?.adminFee) ?? 0;
          const otherFee = toNumber(billing.courseRun?.otherFee) ?? 0;
          totalAdditionalFees += contingencyFee + adminFee + otherFee;
        });

        const totalAmount = contractFees + venueFees + totalTrainerFees + totalAdditionalFees;

        return {
          ...report,
          totalCourseRuns,
          totalParticipants,
          contractFees,
          venueFees,
          totalAmount,
          totalTrainerFees,
          totalAdditionalFees,
        };
      });

      return res.json({
        success: true,
        data: formatted,
      });
    } catch (error) {
      console.error("Error fetching billing reports:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch billing reports",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  /**
   * GET /api/billing-reports/:id
   * Get billing report detail
   */
  async getBillingReportDetail(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Billing report ID is required",
        });
      }

      const billingReport = await prisma.billingReport.findUniqueOrThrow({
        where: { id },
        include: {
          courseRunBillings: {
            include: {
              courseRun: {
                include: {
                  course: true,
                  venue: true,
                  courseRunLearners: true,
                  courseRunTrainers: {
                    where: { deletedAt: null },
                  },
                },
              },
            },
          },
        },
      });

      // Normalize numeric fields (Decimal -> number) on nested objects so frontend
      // won't receive Decimal objects which can lead to string concatenation issues.
      const normalizedCourseRunBillings = (billingReport.courseRunBillings || []).map((b: any) => ({
        ...b,
        contractInvoiceAmount: toNumber(b.contractInvoiceAmount) ?? 0,
        venueInvoiceAmount: toNumber(b.venueInvoiceAmount) ?? 0,
        courseRun: {
          ...b.courseRun,
          courseRunLearners: b.courseRun?.courseRunLearners || [],
        },
        courseRunBillingEntries: (b.courseRunBillingEntries || []).map((entry: any) => ({
          ...entry,
          invoiceAmount: toNumber(entry.invoiceAmount) ?? 0,
          courseRunLearners: entry.courseRunLearners || [],
        })),
      }));

      // Compute totals dynamically from courseRunBillings
      const totalCourseRuns = billingReport.courseRunBillings.length;
      let totalParticipants = 0;
      let contractFees = 0;
      let venueFees = 0;
      let totalTrainerFees = 0;
      let totalAdditionalFees = 0;

      billingReport.courseRunBillings.forEach((billing: any) => {
        totalParticipants += billing.courseRun?.courseRunLearners?.length || 0;
        contractFees += toNumber(billing.contractInvoiceAmount) ?? 0;
        venueFees += toNumber(billing.venueInvoiceAmount) ?? 0;

        // Sum trainer fees
        const courseRunTrainers = billing.courseRun?.courseRunTrainers || [];
        courseRunTrainers.forEach((trainer: any) => {
          const baseAmount = toNumber(trainer.trainerBaseAmount) ?? 0;
          const additionalCost = toNumber(trainer.additionalCost) ?? 0;
          totalTrainerFees += baseAmount + additionalCost;
        });

        // Sum additional fees
        const contingencyFee = toNumber(billing.courseRun?.contingencyFee) ?? 0;
        const adminFee = toNumber(billing.courseRun?.adminFee) ?? 0;
        const otherFee = toNumber(billing.courseRun?.otherFee) ?? 0;
        totalAdditionalFees += contingencyFee + adminFee + otherFee;
      });

      const totalAmount = contractFees + venueFees + totalTrainerFees + totalAdditionalFees;

      return res.json({
        success: true,
        data: {
          ...billingReport,
          courseRunBillings: normalizedCourseRunBillings,
          totalCourseRuns,
          totalParticipants,
          contractFees,
          venueFees,
          totalAmount,
          totalTrainerFees,
          totalAdditionalFees,
        },
      });
    } catch (error) {
      console.error("Error fetching billing report detail:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch billing report",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  /**
   * GET /api/billing-reports/:id/export
   * Export consolidated billing report for all course runs in a billing month
   */
  async exportConsolidatedBilling(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Billing report ID is required",
        });
      }

      const billingReport = await prisma.billingReport.findUnique({
        where: { id },
        include: {
          courseRunBillings: {
            where: { deletedAt: null },
            include: {
              courseRun: {
                include: {
                  course: {
                    select: {
                      id: true,
                      title: true,
                      courseCode: true,
                      discounts: true,
                    },
                  },
                  venue: true,
                  courseRunLearners: {
                    where: { deletedAt: null },
                    include: {
                      learner: true,
                    },
                  },
                  courseRunTrainers: {
                    where: { deletedAt: null },
                  },
                },
              },
              courseRunBillingEntries: {
                include: {
                  courseRunLearners: {
                    where: { deletedAt: null },
                    include: {
                      learner: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!billingReport) {
        return res.status(404).json({
          success: false,
          message: "Billing report not found",
        });
      }

      // Compute totals dynamically from courseRunBillings
      let totalCourseRuns = billingReport.courseRunBillings.length;
      let totalParticipants = 0;
      let contractFees = 0;
      let venueFees = 0;
      let totalTrainerFees = 0;
      let totalAdditionalFees = 0;

      billingReport.courseRunBillings.forEach((billing: any) => {
        totalParticipants += billing.courseRun?.courseRunLearners?.length || 0;
        contractFees += toNumber(billing.contractInvoiceAmount) ?? 0;
        venueFees += toNumber(billing.venueInvoiceAmount) ?? 0;

        // Sum trainer fees
        const courseRunTrainers = billing.courseRun?.courseRunTrainers || [];
        courseRunTrainers.forEach((trainer: any) => {
          const baseAmount = toNumber(trainer.trainerBaseAmount) ?? 0;
          const additionalCost = toNumber(trainer.additionalCost) ?? 0;
          totalTrainerFees += baseAmount + additionalCost;
        });

        // Sum additional fees
        const contingencyFee = toNumber(billing.courseRun?.contingencyFee) ?? 0;
        const adminFee = toNumber(billing.courseRun?.adminFee) ?? 0;
        const otherFee = toNumber(billing.courseRun?.otherFee) ?? 0;
        totalAdditionalFees += contingencyFee + adminFee + otherFee;
      });

      const totalAmount = contractFees + venueFees + totalTrainerFees + totalAdditionalFees;

      // Format export data to return to frontend for client-side XLSX generation
      const exportData = {
        billingMonth: billingReport.billingMonth,
        totalCourseRuns,
        totalParticipants,
        contractFees,
        venueFees,
        totalAmount,
        totalTrainerFees,
        totalAdditionalFees,
        status: billingReport.status,
        courseRuns: billingReport.courseRunBillings.map((billing: any) => {
          // Calculate trainer fees for this course run
          const courseRunTrainers = billing.courseRun?.courseRunTrainers || [];
          const trainerFees = courseRunTrainers.reduce((sum: number, trainer: any) => {
            const baseAmount = toNumber(trainer.trainerBaseAmount) ?? 0;
            const additionalCost = toNumber(trainer.additionalCost) ?? 0;
            return sum + baseAmount + additionalCost;
          }, 0);

          // Calculate additional fees for this course run
          const contingencyFee = toNumber(billing.courseRun?.contingencyFee) ?? 0;
          const adminFee = toNumber(billing.courseRun?.adminFee) ?? 0;
          const otherFee = toNumber(billing.courseRun?.otherFee) ?? 0;
          const additionalFees = contingencyFee + adminFee + otherFee;

          return {
            courseRunCode: billing.courseRun.serialNumber || '',
            courseTitle: billing.courseRun.course?.title || '',
            courseCode: billing.courseRun.course?.courseCode || '',
            startDate: billing.courseRun.startDatetime,
            endDate: billing.courseRun.endDatetime,
            venue: billing.courseRun.venue?.name || billing.courseRun.specifiedLocation || '',
            participants: billing.courseRun.courseRunLearners.length,
            contractFees: toNumber(billing.contractInvoiceAmount) ?? 0,
            venueFees: toNumber(billing.venueInvoiceAmount) ?? 0,
            totalAmount: (toNumber(billing.contractInvoiceAmount) ?? 0) + (toNumber(billing.venueInvoiceAmount) ?? 0) + trainerFees + additionalFees,
            trainerFees,
            additionalFees,
            status: billing.courseRun.status,
            courseDiscounts: billing.courseRun.course?.discounts || [],
            billing: {
              valueOfWorkDone: toNumber(billing.valueOfWorkDone) ?? 0,
              contractFeePBMSBENumber: billing.contractFeePBMSBENumber,
              contractPBMSInvoiceDate: billing.contractPBMSInvoiceDate,
              contractInvoiceAmount: toNumber(billing.contractInvoiceAmount) ?? 0,
              venuePBMSBENumber: billing.venuePBMSBENumber,
              venuePBMSInvoiceDate: billing.venuePBMSInvoiceDate,
              venueInvoiceAmount: toNumber(billing.venueInvoiceAmount) ?? 0,
              finalRemarks: billing.finalRemarks,
              entries: billing.courseRunBillingEntries.map((entry: any) => ({
                pbmsInvoiceNumber: entry.pbmsInvoiceNumber,
                pbmsInvoiceDate: entry.pbmsInvoiceDate,
                invoiceAmount: toNumber(entry.invoiceAmount) ?? 0,
                learners: entry.courseRunLearners.map((crl: any) => ({
                  name: crl.learner?.fullname || '',
                  email: crl.learner?.email || '',
                  discountId: crl.discountId,
                  discountPercentage: toNumber(crl.discountPercentage) ?? 0,
                })),
                remarks: entry.remarks,
              })),
            },
          };
        }),
      };

      // Return data as JSON with a downloadUrl property that signals frontend to download
      // Frontend will generate the XLSX file from this data
      return res.json({
        success: true,
        data: exportData,
        downloadUrl: `/api/billing-reports/${id}/export-download`, // Signal to frontend
      });
    } catch (error) {
      console.error("Error exporting consolidated billing:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to export consolidated billing",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
