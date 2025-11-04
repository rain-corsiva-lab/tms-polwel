import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

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

      // Filter by month range
      // Frontend sends format "YYYY-MM", we need to convert to "MonthName YYYY"
      if (startMonth || endMonth) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const convertToMonthString = (yyyyMm: string): string => {
          const parts = yyyyMm.split('-');
          const year = parts[0] || '';
          const month = parts[1] || '01';
          const monthIndex = parseInt(month, 10) - 1;
          return `${monthNames[monthIndex]} ${year}`;
        };

        if (startMonth && endMonth && typeof startMonth === 'string' && typeof endMonth === 'string') {
          const startMonthStr = convertToMonthString(startMonth);
          const endMonthStr = convertToMonthString(endMonth);
          
          whereClause.AND = [
            { billingMonth: { gte: startMonthStr } },
            { billingMonth: { lte: endMonthStr } },
          ];
        } else if (startMonth && typeof startMonth === 'string') {
          const startMonthStr = convertToMonthString(startMonth);
          whereClause.billingMonth = { gte: startMonthStr };
        } else if (endMonth && typeof endMonth === 'string') {
          const endMonthStr = convertToMonthString(endMonth);
          whereClause.billingMonth = { lte: endMonthStr };
        }
      }

      const billingReports = await prisma.billingReport.findMany({
        where: whereClause,
        include: {
          courseRunBillings: {
            include: {
              courseRun: {
                include: {
                  course: true,
                  courseRunLearners: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Format the response
      const formatted = billingReports.map((report: any) => ({
        ...report,
        contractFees: report.contractFees?.toNumber() ?? 0,
        venueFees: report.venueFees?.toNumber() ?? 0,
        totalAmount: report.totalAmount?.toNumber() ?? 0,
      }));

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
        contractInvoiceAmount: b.contractInvoiceAmount?.toNumber ? b.contractInvoiceAmount.toNumber() : Number(b.contractInvoiceAmount) || 0,
        venueInvoiceAmount: b.venueInvoiceAmount?.toNumber ? b.venueInvoiceAmount.toNumber() : Number(b.venueInvoiceAmount) || 0,
        courseRun: {
          ...b.courseRun,
          courseRunLearners: b.courseRun?.courseRunLearners || [],
        },
        courseRunBillingEntries: (b.courseRunBillingEntries || []).map((entry: any) => ({
          ...entry,
          invoiceAmount: entry.invoiceAmount?.toNumber ? entry.invoiceAmount.toNumber() : Number(entry.invoiceAmount) || 0,
          courseRunLearners: entry.courseRunLearners || [],
        })),
      }));

      return res.json({
        success: true,
        data: {
          ...billingReport,
          courseRunBillings: normalizedCourseRunBillings,
          contractFees: billingReport.contractFees?.toNumber() ?? 0,
          venueFees: billingReport.venueFees?.toNumber() ?? 0,
          totalAmount: billingReport.totalAmount?.toNumber() ?? 0,
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
                  course: true,
                  venue: true,
                  courseRunLearners: {
                    where: { deletedAt: null },
                    include: {
                      learner: true,
                    },
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

      // Format export data to return to frontend for client-side XLSX generation
      const exportData = {
        billingMonth: billingReport.billingMonth,
        totalCourseRuns: billingReport.totalCourseRuns,
        totalParticipants: billingReport.totalParticipants,
        contractFees: billingReport.contractFees?.toNumber() ?? 0,
        venueFees: billingReport.venueFees?.toNumber() ?? 0,
        totalAmount: billingReport.totalAmount?.toNumber() ?? 0,
        status: billingReport.status,
        courseRuns: billingReport.courseRunBillings.map((billing: any) => ({
          courseRunCode: billing.courseRun.serialNumber || '',
          courseTitle: billing.courseRun.course?.title || '',
          courseCode: billing.courseRun.course?.courseCode || '',
          startDate: billing.courseRun.startDatetime,
          endDate: billing.courseRun.endDatetime,
          venue: billing.courseRun.venue?.name || billing.courseRun.specifiedLocation || '',
          participants: billing.courseRun.courseRunLearners.length,
          contractFees: billing.contractInvoiceAmount?.toNumber() ?? 0,
          venueFees: billing.venueInvoiceAmount?.toNumber() ?? 0,
          totalAmount: (billing.contractInvoiceAmount?.toNumber() ?? 0) + (billing.venueInvoiceAmount?.toNumber() ?? 0),
          status: billing.courseRun.status,
          billing: {
            valueOfWorkDone: billing.valueOfWorkDone?.toNumber() ?? 0,
            contractFeePBMSBENumber: billing.contractFeePBMSBENumber,
            contractPBMSInvoiceDate: billing.contractPBMSInvoiceDate,
            contractInvoiceAmount: billing.contractInvoiceAmount?.toNumber() ?? 0,
            venuePBMSBENumber: billing.venuePBMSBENumber,
            venuePBMSInvoiceDate: billing.venuePBMSInvoiceDate,
            venueInvoiceAmount: billing.venueInvoiceAmount?.toNumber() ?? 0,
            finalRemarks: billing.finalRemarks,
            entries: billing.courseRunBillingEntries.map((entry: any) => ({
              pbmsInvoiceNumber: entry.pbmsInvoiceNumber,
              pbmsInvoiceDate: entry.pbmsInvoiceDate,
              invoiceAmount: entry.invoiceAmount?.toNumber() ?? 0,
              learners: entry.courseRunLearners.map((crl: any) => ({
                name: crl.learner?.fullname || '',
                email: crl.learner?.email || '',
              })),
              remarks: entry.remarks,
            })),
          },
        })),
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
