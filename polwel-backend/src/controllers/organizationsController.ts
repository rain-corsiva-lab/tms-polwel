import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const organizationsController = {
  // Get all organizations with optional filtering by type
  async getOrganizations(req: Request, res: Response): Promise<Response> {
    try {
      const { type, status = 'ACTIVE' } = req.query;

      const where: any = {
        status: status as string
      };

      // Filter by organization type if provided
      if (type && type !== 'all') {
        where.organizationType = type;
      }

      const organizations = await prisma.organization.findMany({
        where,
        orderBy: {
          name: 'asc'
        },
        select: {
          id: true,
          name: true,
          address: true,
          contactEmail: true,
          contactPhone: true,
          contactPerson: true,
          buNumber: true,
          organizationType: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return res.json({
        success: true,
        organizations,
        total: organizations.length
      });
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch organizations',
        message: error.message
      });
    }
  },

  // Get single organization by ID
  async getOrganizationById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ success: false, message: 'Organization ID is required' });
      }

      const organization = await prisma.organization.findUnique({
        where: { id },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          courseRunLearners: {
            take: 10,
            select: {
              id: true,
              learner: {
                select: {
                  id: true,
                  fullname: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (!organization || organization.status === 'INACTIVE') {
        return res.status(404).json({
          success: false,
          error: 'Organization not found'
        });
      }

      return res.json({
        success: true,
        organization
      });
    } catch (error: any) {
      console.error('Error fetching organization:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch organization',
        message: error.message
      });
    }
  },

  // Get all enrollments (course run learners) for an organization
  async getOrganizationEnrollments(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { page = '1', limit = '50', status, search } = req.query;

      if (!id) {
        return res.status(400).json({ success: false, message: 'Organization ID is required' });
      }

      const pageNumber = parseInt(page as string);
      const limitNumber = parseInt(limit as string);
      const skip = (pageNumber - 1) * limitNumber;

      // Build where clause
      const where: any = {
        clientOrganizationId: id,
        deletedAt: null,
        enrollmentStatus: { not: 'WITHDRAWN' }
      };

      // Filter by enrollment status if provided
      if (status && status !== 'all') {
        where.status = status;
      }

      // Search in learner name or email
      if (search) {
        where.learner = {
          OR: [
            { fullname: { contains: search as string } },
            { email: { contains: search as string } }
          ]
        };
      }

      // Get total count
      const total = await prisma.courseRunLearner.count({ where });

      // Get enrollments with relations
      const enrollments = await prisma.courseRunLearner.findMany({
        where,
        skip,
        take: limitNumber,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          learner: {
            select: {
              id: true,
              fullname: true,
              email: true,
              contact: true,
              designation: true
            }
          },
          courseRun: {
            select: {
              id: true,
              serialNumber: true,
              startDatetime: true,
              endDatetime: true,
              venue: true,
              status: true,
              course: {
                select: {
                  id: true,
                  title: true,
                  courseCode: true
                }
              }
            }
          },
          trainingCoordinator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          clientOrganization: {
            select: {
              id: true,
              name: true,
              organizationType: true
            }
          }
        }
      });

      return res.json({
        success: true,
        enrollments,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: Math.ceil(total / limitNumber)
        }
      });
    } catch (error: any) {
      console.error('Error fetching organization enrollments:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch organization enrollments',
        message: error.message
      });
    }
  },

  // Scan and find all duplicate organization names
  async getDuplicates(req: Request, res: Response): Promise<Response> {
    try {
      const groups = await prisma.organization.groupBy({
        by: ['name'],
        where: {
          status: { not: 'INACTIVE' }
        },
        _count: {
          name: true
        },
        having: {
          name: {
            _count: {
              gt: 1
            }
          }
        }
      });

      const duplicateGroups = [];
      for (const group of groups) {
        if (!group.name) continue;

        const orgs = await prisma.organization.findMany({
          where: {
            name: group.name,
            status: { not: 'INACTIVE' }
          },
          orderBy: {
            createdAt: 'asc'
          }
        });

        if (orgs.length > 1) {
          const primary = orgs[0];
          if (!primary) continue;
          const duplicates = orgs.slice(1);
          
          const duplicateIds = duplicates.map(d => d.id);
          const learnerCount = await prisma.courseRunLearner.count({
            where: {
              clientOrganizationId: { in: duplicateIds }
            }
          });

          duplicateGroups.push({
            name: group.name,
            count: orgs.length,
            learnerCount,
            primary: {
              id: primary.id,
              name: primary.name,
              createdAt: primary.createdAt,
              buNumber: primary.buNumber,
              organizationType: primary.organizationType
            },
            duplicates: duplicates.map(d => ({
              id: d.id,
              name: d.name,
              createdAt: d.createdAt,
              buNumber: d.buNumber,
              organizationType: d.organizationType
            }))
          });
        }
      }

      return res.json({
        success: true,
        count: duplicateGroups.length,
        groups: duplicateGroups
      });
    } catch (error: any) {
      console.error('Error fetching duplicate organizations:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch duplicate organizations',
        message: error.message
      });
    }
  },

  // Merge duplicates into the primary organization and update references
  async mergeDuplicates(req: Request, res: Response): Promise<Response> {
    try {
      const groups = await prisma.organization.groupBy({
        by: ['name'],
        where: {
          status: { not: 'INACTIVE' }
        },
        _count: {
          name: true
        },
        having: {
          name: {
            _count: {
              gt: 1
            }
          }
        }
      });

      let totalMergedGroups = 0;
      let totalDeletedCount = 0;
      let totalMergedLearners = 0;
      let totalDeletedLearners = 0;
      let totalMergedCoordinators = 0;
      let totalDeletedCoordinators = 0;
      const totalUpdatedReferences = {
        courseRunLearners: 0,
        bookings: 0,
        users: 0,
        courseRuns: 0
      };

      await prisma.$transaction(async (tx) => {
        // 1. Merge Duplicate Organizations
        for (const group of groups) {
          if (!group.name) continue;

          const orgs = await tx.organization.findMany({
            where: {
              name: group.name,
              status: { not: 'INACTIVE' }
            },
            orderBy: {
              createdAt: 'asc'
            }
          });

          if (orgs.length > 1) {
            const primary = orgs[0];
            if (!primary) continue;
            const primaryId = primary.id;
            const duplicateIds = orgs.slice(1).map(d => d.id);

            // Update courseRunLearners
            const learnersRes = await tx.courseRunLearner.updateMany({
              where: { clientOrganizationId: { in: duplicateIds } },
              data: { clientOrganizationId: primaryId }
            });
            totalUpdatedReferences.courseRunLearners += learnersRes.count;

            // Update bookings
            const bookingsRes = await tx.booking.updateMany({
              where: { organizationId: { in: duplicateIds } },
              data: { organizationId: primaryId }
            });
            totalUpdatedReferences.bookings += bookingsRes.count;

            // Update users
            const usersRes = await tx.user.updateMany({
              where: { organizationId: { in: duplicateIds } },
              data: { organizationId: primaryId }
            });
            totalUpdatedReferences.users += usersRes.count;

            // Update dedicated courseRuns
            const runsRes = await tx.courseRun.updateMany({
              where: { clientOrganizationId: { in: duplicateIds } },
              data: { clientOrganizationId: primaryId }
            });
            totalUpdatedReferences.courseRuns += runsRes.count;

            // Delete duplicates
            const deleteRes = await tx.organization.deleteMany({
              where: { id: { in: duplicateIds } }
            });
            totalDeletedCount += deleteRes.count;
            totalMergedGroups++;
          }
        }

        // 2. Merge Duplicate Learners (matching email)
        const duplicateLearnerGroups = await tx.learner.groupBy({
          by: ['email'],
          where: {
            deletedAt: null,
            email: { not: null, notIn: [''] }
          },
          _count: {
            email: true
          },
          having: {
            email: {
              _count: {
                gt: 1
              }
            }
          }
        });

        for (const learnerGroup of duplicateLearnerGroups) {
          if (!learnerGroup.email) continue;

          const activeLearners = await tx.learner.findMany({
            where: {
              email: learnerGroup.email,
              deletedAt: null
            },
            orderBy: {
              createdAt: 'asc'
            }
          });

          if (activeLearners.length > 1) {
            const primaryLearner = activeLearners[0];
            if (!primaryLearner) continue;
            const secondaryLearners = activeLearners.slice(1);

            for (const secondaryLearner of secondaryLearners) {
              // Resolve courseRunLearners (enrollments)
              const enrollments = await tx.courseRunLearner.findMany({
                where: { learnerId: secondaryLearner.id }
              });

              for (const enroll of enrollments) {
                const primaryEnroll = await tx.courseRunLearner.findUnique({
                  where: {
                    courseRunId_learnerId: {
                      courseRunId: enroll.courseRunId,
                      learnerId: primaryLearner.id
                    }
                  }
                });

                if (primaryEnroll) {
                  // Duplicate enrollment. Delete the secondary's attendance and then the enrollment
                  await tx.courseRunLearnerAttendance.deleteMany({
                    where: { learnerId: secondaryLearner.id, courseRunId: enroll.courseRunId }
                  });
                  await tx.courseRunLearner.delete({
                    where: { id: enroll.id }
                  });
                } else {
                  // Redirect enrollment to primary learner
                  await tx.courseRunLearner.update({
                    where: { id: enroll.id },
                    data: { learnerId: primaryLearner.id }
                  });
                }
              }

              // Resolve remaining courseRunLearnerAttendances
              const attendances = await tx.courseRunLearnerAttendance.findMany({
                where: { learnerId: secondaryLearner.id }
              });

              for (const att of attendances) {
                const primaryAtt = await tx.courseRunLearnerAttendance.findUnique({
                  where: {
                    courseRunId_learnerId_day: {
                      courseRunId: att.courseRunId,
                      learnerId: primaryLearner.id,
                      day: att.day
                    }
                  }
                });

                if (primaryAtt) {
                  // Primary attendance already exists, delete the secondary
                  await tx.courseRunLearnerAttendance.delete({
                    where: { id: att.id }
                  });
                } else {
                  // Update to point to primary learner
                  await tx.courseRunLearnerAttendance.update({
                    where: { id: att.id },
                    data: { learnerId: primaryLearner.id }
                  });
                }
              }

              // Delete secondary learner
              await tx.learner.update({
                where: { id: secondaryLearner.id },
                data: { deletedAt: new Date() }
              });
              totalDeletedLearners++;
            }
            totalMergedLearners++;
          }
        }

        // 3. Merge Duplicate Training Coordinators (matching email)
        const duplicateCoordinatorGroups = await tx.user.groupBy({
          by: ['email'],
          where: {
            role: 'TRAINING_COORDINATOR',
            deletedAt: null,
            email: { not: null, notIn: [''] }
          },
          _count: {
            email: true
          },
          having: {
            email: {
              _count: {
                gt: 1
              }
            }
          }
        });

        for (const coordGroup of duplicateCoordinatorGroups) {
          if (!coordGroup.email) continue;

          const activeCoordinators = await tx.user.findMany({
            where: {
              role: 'TRAINING_COORDINATOR',
              email: coordGroup.email,
              deletedAt: null
            },
            orderBy: {
              createdAt: 'asc'
            }
          });

          if (activeCoordinators.length > 1) {
            const primaryCoordinator = activeCoordinators[0];
            if (!primaryCoordinator) continue;
            const secondaryCoordinators = activeCoordinators.slice(1);

            for (const secondaryCoordinator of secondaryCoordinators) {
              // Redirect trainingCoordinatorId references in CourseRunLearner
              const enrollRes = await tx.courseRunLearner.updateMany({
                where: { trainingCoordinatorId: secondaryCoordinator.id },
                data: { trainingCoordinatorId: primaryCoordinator.id }
              });
              totalUpdatedReferences.courseRunLearners += enrollRes.count;

              // Redirect createdBy bookingsCreated
              await tx.booking.updateMany({
                where: { createdBy: secondaryCoordinator.id },
                data: { createdBy: primaryCoordinator.id }
              });

              // Redirect userId in bookings
              await tx.booking.updateMany({
                where: { userId: secondaryCoordinator.id },
                data: { userId: primaryCoordinator.id }
              });

              // Soft-delete duplicate coordinator (setting INACTIVE, deletedAt, and renaming email to free the unique constraint)
              await tx.user.update({
                where: { id: secondaryCoordinator.id },
                data: {
                  status: 'INACTIVE',
                  deletedAt: new Date(),
                  email: secondaryCoordinator.email ? `${secondaryCoordinator.email}_merged_${Date.now()}` : null
                }
              });
              totalDeletedCoordinators++;
            }
            totalMergedCoordinators++;
          }
        }
      }, { maxWait: 15000, timeout: 60000 });

      return res.json({
        success: true,
        mergedGroups: totalMergedGroups,
        deletedCount: totalDeletedCount,
        mergedLearners: totalMergedLearners,
        deletedLearners: totalDeletedLearners,
        mergedCoordinators: totalMergedCoordinators,
        deletedCoordinators: totalDeletedCoordinators,
        referencesUpdated: totalUpdatedReferences
      });
    } catch (error: any) {
      console.error('Error merging duplicate organizations:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to merge duplicate organizations',
        message: error.message
      });
    }
  }
};
