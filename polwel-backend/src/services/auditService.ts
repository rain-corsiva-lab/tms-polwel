import { AuditActionType } from '@prisma/client';
import prisma from '../lib/prisma';
import { Request } from 'express';



interface AuditLogData {
  userId?: string;
  action: string;
  actionType: AuditActionType;
  tableName?: string;
  recordId?: string;
  oldValues?: any;
  newValues?: any;
  details?: string;
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

class AuditService {
  static async log(data: AuditLogData, req?: Request): Promise<any> {
    try {
      const auditData: any = {
        userId: data.userId || null,
        action: data.action,
        actionType: data.actionType,
        tableName: data.tableName || null,
        recordId: data.recordId || null,
        oldValues: data.oldValues || null,
        newValues: data.newValues || null,
        details: data.details || null,
        performedBy: data.performedBy || null,
        ipAddress: data.ipAddress || req?.ip || req?.connection?.remoteAddress || null,
        userAgent: data.userAgent || req?.get('User-Agent') || null,
        timestamp: new Date(),
      };

      return await prisma.auditLog.create({
        data: auditData
      });
    } catch (error) {
      console.error('Audit log error:', error);
      return null; // Don't throw - audit logging shouldn't break the main operation
    }
  }

  static async getUserAuditTrail(userId: string, limit: number = 50) {
    const auditLogs = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Resolve performedBy names for each entry
    const resolvedLogs = await Promise.all(
      auditLogs.map(async (log) => {
        let performedByName = log.performedBy || 'System';
        
        // If performedBy looks like a user ID, resolve it to name and email
        if (log.performedBy && log.performedBy.length > 10) {
          try {
            const performer = await prisma.user.findUnique({
              where: { id: log.performedBy },
              select: { name: true, email: true }
            });
            
            if (performer) {
              performedByName = `${performer.name} (${performer.email})`;
            }
          } catch (error) {
            console.error('Error resolving performer:', error);
          }
        }

        return {
          ...log,
          performedBy: performedByName
        };
      })
    );

    return resolvedLogs;
  }

  static async logLogin(userId: string, details: string, req?: Request) {
    return this.log({
      userId,
      action: 'User Login',
      actionType: AuditActionType.LOGIN,
      details,
      performedBy: userId
    }, req);
  }

  static async logLogout(userId: string, details: string, req?: Request) {
    return this.log({
      userId,
      action: 'User Logout',
      actionType: AuditActionType.LOGOUT,
      details,
      performedBy: userId
    }, req);
  }

  static async logUserCreation(userId: string, performedBy: string, details: string, req?: Request) {
    return this.log({
      userId,
      action: 'User Created',
      actionType: AuditActionType.CREATION,
      tableName: 'users',
      recordId: userId,
      details,
      performedBy
    }, req);
  }

  static async logUserUpdate(userId: string, performedBy: string, oldValues: any, newValues: any, details: string, req?: Request) {
    return this.log({
      userId,
      action: 'User Updated',
      actionType: AuditActionType.UPDATE,
      tableName: 'users',
      recordId: userId,
      oldValues,
      newValues,
      details,
      performedBy
    }, req);
  }

  static async logPermissionChange(userId: string, performedBy: string, details: string, req?: Request) {
    return this.log({
      userId,
      action: 'Permissions Changed',
      actionType: AuditActionType.PERMISSION_CHANGE,
      tableName: 'user_permissions',
      recordId: userId,
      details,
      performedBy
    }, req);
  }

  static async logPasswordChange(userId: string, performedBy: string, details: string, req?: Request) {
    return this.log({
      userId,
      action: 'Password Changed',
      actionType: AuditActionType.PASSWORD_CHANGE,
      details,
      performedBy
    }, req);
  }

  static async logStatusChange(userId: string, performedBy: string, oldStatus: string, newStatus: string, details: string, req?: Request) {
    return this.log({
      userId,
      action: 'Status Changed',
      actionType: AuditActionType.STATUS_CHANGE,
      tableName: 'users',
      recordId: userId,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      details,
      performedBy
    }, req);
  }
}

export default AuditService;
