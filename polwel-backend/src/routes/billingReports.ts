import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { billingReportsController } from "../controllers/billingReportsController";

const router = Router();

// Middleware to require authentication
router.use(authenticate);

/**
 * GET /api/billing-reports
 * Get all billing reports with optional filtering
 * Query params: search, startMonth, endMonth
 */
router.get("/", billingReportsController.getBillingReports);

/**
 * GET /api/billing-reports/:id
 * Get specific billing report detail
 */
router.get("/:id", billingReportsController.getBillingReportDetail);

/**
 * GET /api/billing-reports/:id/export
 * Export consolidated billing report for all course runs in a billing month
 */
router.get("/:id/export", billingReportsController.exportConsolidatedBilling);

export default router;
