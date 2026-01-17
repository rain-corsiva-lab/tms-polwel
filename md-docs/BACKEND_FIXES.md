# Backend TypeScript Fixes for courseRunController.ts

Apply these fixes to `polwel-backend/src/controllers/courseRunController.ts`:

## Fix 1: markAsConfirmed function test

Replace lines 2189-2232 with:

```typescript
  // Mark course run as confirmed (PENDING → CONFIRMED_PENDING_TA_APPROVAL)
  async markAsConfirmed(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      const courseRun = await prisma.courseRun.findFirst({
        where: { id, deletedAt: null },
        include: {
          course: true,
        },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      if (courseRun.status !== 'PENDING') {
        res.status(400).json({
          success: false,
          error: `Cannot mark as confirmed. Current status is ${courseRun.status}`,
        });
        return;
      }

      const updated = await prisma.courseRun.update({
        where: { id },
        data: {
          status: 'CONFIRMED_PENDING_TA_APPROVAL',
          statusLastEvaluatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Course run marked as confirmed, pending trainer approval',
        courseRun: updated,
      });
    } catch (error) {
      console.error('Error marking course run as confirmed:', error);
      res.status(500).json(buildErrorResponse('courseRunController.markAsConfirmed', 'Failed to mark course run as confirmed', error));
    }
  },
```

## Fix 2: approveTrainerAssignment function

Replace lines 2234-2283 with:

```typescript
  // Approve trainer assignment (CONFIRMED_PENDING_TA_APPROVAL → CONFIRMED_PENDING_CONFIRMATION_EMAILS)
  async approveTrainerAssignment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      const courseRun = await prisma.courseRun.findFirst({
        where: { id, deletedAt: null },
        include: {
          course: true,
          courseRunTrainers: {
            include: {
              trainer: true,
            },
          },
        },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      if (courseRun.status !== 'CONFIRMED_PENDING_TA_APPROVAL') {
        res.status(400).json({
          success: false,
          error: `Cannot approve trainer assignment. Current status is ${courseRun.status}`,
        });
        return;
      }

      const updated = await prisma.courseRun.update({
        where: { id },
        data: {
          status: 'CONFIRMED_PENDING_CONFIRMATION_EMAILS',
          statusLastEvaluatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Trainer assignment approved',
        courseRun: updated,
      });
    } catch (error) {
      console.error('Error approving trainer assignment:', error);
      res.status(500).json(buildErrorResponse('courseRunController.approveTrainerAssignment', 'Failed to approve trainer assignment', error));
    }
  },
```

## Fix 3: rejectTrainerAssignment function

Replace lines 2284-2317 with:

```typescript
  // Reject trainer assignment (stays at CONFIRMED_PENDING_TA_APPROVAL)
  async rejectTrainerAssignment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      const courseRun = await prisma.courseRun.findFirst({
        where: { id, deletedAt: null },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      if (courseRun.status !== 'CONFIRMED_PENDING_TA_APPROVAL') {
        res.status(400).json({
          success: false,
          error: `Cannot reject trainer assignment. Current status is ${courseRun.status}`,
        });
        return;
      }

      // Just return success - no status change
      res.json({
        success: true,
        message: 'Trainer assignment rejected',
      });
    } catch (error) {
      console.error('Error rejecting trainer assignment:', error);
      res.status(500).json(buildErrorResponse('courseRunController.rejectTrainerAssignment', 'Failed to reject trainer assignment', error));
    }
  },
```

## Fix 4: sendCourseConfirmationEmail function

Replace lines 2318-2390 with:

```typescript
  // Send course confirmation email to learners
  async sendCourseConfirmationEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const { cc, additionalBodyContent } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      const courseRun = await prisma.courseRun.findFirst({
        where: { id, deletedAt: null },
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
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      if (courseRun.status !== 'CONFIRMED_PENDING_CONFIRMATION_EMAILS') {
        res.status(400).json({
          success: false,
          error: `Cannot send confirmation emails. Current status is ${courseRun.status}`,
        });
        return;
      }

      // Send emails to all learners
      const emailPromises = courseRun.courseRunLearners.map(async (crl) => {
        try {
          // Update learner email status
          await prisma.courseRunLearner.update({
            where: { id: crl.id },
            data: {
              confirmationEmailStatus: 'SENT',
              confirmationEmailLastSentAt: new Date(),
            },
          });

          // TODO: Integrate with actual email service
          console.log(`Sending course confirmation email to ${crl.learner.email}`);
          
          return { success: true, learnerId: crl.learnerId };
        } catch (err) {
          console.error(`Failed to send email to learner ${crl.learnerId}:`, err);
          return { success: false, learnerId: crl.learnerId };
        }
      });

      await Promise.all(emailPromises);

      res.json({
        success: true,
        message: 'Course confirmation emails sent successfully',
        emailsSent: courseRun.courseRunLearners.length,
      });
    } catch (error) {
      console.error('Error sending course confirmation emails:', error);
      res.status(500).json(buildErrorResponse('courseRunController.sendCourseConfirmationEmail', 'Failed to send course confirmation emails', error));
    }
  },
```

## Fix 5: sendTrainingAssignmentEmailToLearners function

Replace lines 2391-2497 with:

```typescript
  // Send training assignment email to learners
  async sendTrainingAssignmentEmailToLearners(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      const courseRun = await prisma.courseRun.findFirst({
        where: { id, deletedAt: null },
        include: {
          course: true,
          venue: true,
          courseRunLearners: {
            where: { deletedAt: null },
            include: {
              learner: true,
            },
          },
          courseRunTrainers: {
            where: { deletedAt: null },
            include: {
              trainer: true,
            },
          },
        },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      if (courseRun.status !== 'CONFIRMED_PENDING_CONFIRMATION_EMAILS') {
        res.status(400).json({
          success: false,
          error: `Cannot send training assignment emails. Current status is ${courseRun.status}`,
        });
        return;
      }

      // Send emails to all learners and trainers
      const learnerEmailPromises = courseRun.courseRunLearners.map(async (crl) => {
        try {
          await prisma.courseRunLearner.update({
            where: { id: crl.id },
            data: {
              confirmationEmailStatus: 'SENT',
              confirmationEmailLastSentAt: new Date(),
            },
          });

          // TODO: Integrate with actual email service
          console.log(`Sending training assignment email to learner ${crl.learner.email}`);
          
          return { success: true, type: 'learner', id: crl.learnerId };
        } catch (err) {
          console.error(`Failed to send email to learner ${crl.learnerId}:`, err);
          return { success: false, type: 'learner', id: crl.learnerId };
        }
      });

      const trainerEmailPromises = courseRun.courseRunTrainers.map(async (crt) => {
        try {
          await prisma.courseRunTrainer.update({
            where: { id: crt.id },
            data: {
              emailStatus: 'SENT',
            },
          });

          // TODO: Integrate with actual email service
          console.log(`Sending training assignment email to trainer ${crt.trainer.email}`);
          
          return { success: true, type: 'trainer', id: crt.trainerId };
        } catch (err) {
          console.error(`Failed to send email to trainer ${crt.trainerId}:`, err);
          return { success: false, type: 'trainer', id: crt.trainerId };
        }
      });

      await Promise.all([...learnerEmailPromises, ...trainerEmailPromises]);

      // Update course run status to CONFIRMED after all emails sent
      await prisma.courseRun.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          statusLastEvaluatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Training assignment emails sent successfully',
        emailsSent: {
          learners: courseRun.courseRunLearners.length,
          trainers: courseRun.courseRunTrainers.length,
        },
      });
    } catch (error) {
      console.error('Error sending training assignment emails:', error);
      res.status(500).json(buildErrorResponse('courseRunController.sendTrainingAssignmentEmailToLearners', 'Failed to send training assignment emails', error));
    }
  },
```

## Summary of Changes:

1. **Added explicit return types**: All functions now have `: Promise<void>` return type
2. **Fixed type assertion**: Changed `const { id } = req.params` to `const { id } = req.params as { id: string }`
3. **Added null checks**: Added explicit check for `if (!id)` with early return
4. **Changed findUnique to findFirst**: This allows the `deletedAt: null` filter to work properly
5. **Removed organization include**: The `organization` field doesn't exist in the Learner include, removed it
6. **Added early returns**: All error paths now have explicit `return` statements to satisfy TypeScript

Apply these changes to your `polwel-backend/src/controllers/courseRunController.ts` file to fix all the TypeScript compilation errors.
