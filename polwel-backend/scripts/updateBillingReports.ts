import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The new getBillingMonthString implementation
const getBillingMonthString = (date: Date): string => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Singapore',
    month: 'long',
    year: 'numeric'
  });
  return formatter.format(date);
};

// Helper to calculate status based on connected course runs
const calculateBillingReportStatus = async (billingReportId: string): Promise<'ALL_COMPLETED' | 'MIXED_STATUS' | 'ALL_INCOMPLETED'> => {
  const billingReport = await prisma.billingReport.findUnique({
    where: { id: billingReportId },
    include: {
      courseRunBillings: {
        where: { deletedAt: null },
        include: {
          courseRun: {
            select: { status: true },
          },
        },
      },
    },
  });

  if (!billingReport || billingReport.courseRunBillings.length === 0) {
    return 'ALL_INCOMPLETED';
  }

  const statuses = billingReport.courseRunBillings.map(b => b.courseRun.status);
  const allCompleted = statuses.every(s => s === 'COMPLETED');
  const allIncompleted = statuses.every(s => s === 'INCOMPLETED' || s === 'PENDING_BILLING' || s === 'DRAFT' || s === 'PENDING');

  if (allCompleted) return 'ALL_COMPLETED';
  if (allIncompleted) return 'ALL_INCOMPLETED';
  return 'MIXED_STATUS';
};

async function main() {
  console.log('🏁 Starting Billing Reports Update Script...');

  // Get all active CourseRunBillings with their CourseRuns
  const courseRunBillings = await prisma.courseRunBilling.findMany({
    where: { deletedAt: null },
    include: {
      courseRun: {
        select: {
          id: true,
          serialNumber: true,
          endDatetime: true,
          status: true,
        }
      },
      billingReport: {
        select: {
          id: true,
          billingMonth: true,
        }
      }
    }
  });

  console.log(`Found ${courseRunBillings.length} CourseRunBilling records to analyze.`);

  const reportsToRecalculate = new Set<string>();

  for (const billing of courseRunBillings) {
    const endDatetime = billing.courseRun?.endDatetime;
    if (!endDatetime) {
      console.log(`⚠️ Course Run ${billing.courseRun?.serialNumber || billing.courseRunId} has no endDatetime. Skipping.`);
      continue;
    }

    const currentMonthStr = billing.billingReport?.billingMonth;
    const newMonthStr = getBillingMonthString(new Date(endDatetime));

    if (currentMonthStr !== newMonthStr) {
      console.log(`🔄 Re-grouping Course Run ${billing.courseRun.serialNumber || billing.courseRunId}:`);
      console.log(`   └─ End Date: ${endDatetime.toISOString()}`);
      console.log(`   └─ Current Group: "${currentMonthStr}"`);
      console.log(`   └─ New Group:     "${newMonthStr}"`);

      // Find or create the target BillingReport
      let targetReport = await prisma.billingReport.findFirst({
        where: { billingMonth: newMonthStr, deletedAt: null }
      });

      if (!targetReport) {
        targetReport = await prisma.billingReport.create({
          data: {
            billingMonth: newMonthStr,
            status: 'ALL_INCOMPLETED',
          }
        });
        console.log(`   └─ Created new BillingReport: "${newMonthStr}" (${targetReport.id})`);
      }

      // Update CourseRunBilling to link to the new BillingReport
      await prisma.courseRunBilling.update({
        where: { id: billing.id },
        data: { billingReportId: targetReport.id }
      });

      console.log(`   └─ Linked CourseRunBilling to "${newMonthStr}"`);

      // Queue recalculation of status for both old and new reports
      if (billing.billingReportId) {
        reportsToRecalculate.add(billing.billingReportId);
      }
      reportsToRecalculate.add(targetReport.id);
    }
  }

  // Recalculate status for all affected reports
  console.log(`\n🔄 Recalculating statuses for ${reportsToRecalculate.size} affected billing reports...`);
  for (const reportId of reportsToRecalculate) {
    const newStatus = await calculateBillingReportStatus(reportId);
    
    // Check if the report now has 0 runs, in which case we should clean it up
    const remainingBillingsCount = await prisma.courseRunBilling.count({
      where: { billingReportId: reportId, deletedAt: null }
    });

    if (remainingBillingsCount === 0) {
      console.log(`🧹 BillingReport ${reportId} has 0 runs left. Marking as deleted.`);
      await prisma.billingReport.update({
        where: { id: reportId },
        data: { deletedAt: new Date() }
      });
    } else {
      await prisma.billingReport.update({
        where: { id: reportId },
        data: { status: newStatus }
      });
      const report = await prisma.billingReport.findUnique({ where: { id: reportId } });
      console.log(`   └─ Report "${report?.billingMonth}": Status set to ${newStatus}`);
    }
  }

  console.log('✅ Billing Reports Update Script completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Error executing update script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
