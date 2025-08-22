import { UserRole } from '@prisma/client';
import prisma from '../lib/prisma';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidationError {
  field: string;
  message: string;
}

export interface EmailConflictInfo {
  exists: boolean;
  conflictRole?: UserRole;
  conflictStatus?: string;
  isActiveConflict: boolean;
}

export class UserValidationService {
  /**
   * Simplified validation - email only
   */
  static validateBasicUserData(data: {
    name?: string;
    email?: string;
    contactNumber?: string;
    department?: string;
    partnerOrganization?: string;
  }): ValidationError[] {
    const errors: ValidationError[] = [];

    // Email validation only
    if (!data.email || data.email.trim().length === 0) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (!EMAIL_REGEX.test(data.email.trim())) {
      errors.push({ field: 'email', message: 'Please enter a valid email address' });
    } else if (data.email.trim().length > 255) {
      errors.push({ field: 'email', message: 'Email must be less than 255 characters' });
    }

    return errors;
  }

  /**
   * Check if email conflicts with existing users
   */
  static async checkEmailConflict(email: string, excludeUserId?: string): Promise<EmailConflictInfo> {
    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return { exists: false, isActiveConflict: false };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for active users with this email
    const existingUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        ...(excludeUserId && { id: { not: excludeUserId } }),
        status: { not: 'INACTIVE' } // Exclude soft-deleted users
      },
      select: {
        id: true,
        role: true,
        status: true,
        email: true
      }
    });

    if (existingUser) {
      return {
        exists: true,
        conflictRole: existingUser.role,
        conflictStatus: existingUser.status,
        isActiveConflict: true
      };
    }

    // Check for soft-deleted users with this email in old_email field
    const softDeletedUser = await prisma.user.findFirst({
      where: {
        old_email: normalizedEmail,
        ...(excludeUserId && { id: { not: excludeUserId } }),
        status: 'INACTIVE'
      },
      select: {
        id: true,
        role: true,
        status: true,
        old_email: true
      }
    });

    if (softDeletedUser) {
      return {
        exists: true,
        conflictRole: softDeletedUser.role,
        conflictStatus: softDeletedUser.status,
        isActiveConflict: false // This is a soft-deleted user, so email can be reused
      };
    }

    return { exists: false, isActiveConflict: false };
  }

  /**
   * Generate human-readable error message for email conflicts
   */
  static generateEmailConflictMessage(conflictInfo: EmailConflictInfo, email: string): string {
    if (!conflictInfo.exists) {
      return '';
    }

    if (conflictInfo.isActiveConflict) {
      const roleText = conflictInfo.conflictRole === 'POLWEL' ? 'POLWEL user' :
                      conflictInfo.conflictRole === 'TRAINER' ? 'trainer' :
                      conflictInfo.conflictRole === 'TRAINING_COORDINATOR' ? 'training coordinator' : 'user';
      
      return `Email ${email} is already registered as an active ${roleText}`;
    } else {
      return `Email ${email} was previously used but is now available for reuse`;
    }
  }

  /**
   * Validate POLWEL user data - simplified to email only
   */
  static async validatePolwelUserData(data: {
    name?: string;
    email?: string;
    contactNumber?: string;
    department?: string;
  }, excludeUserId?: string): Promise<ValidationError[]> {
    const errors = this.validateBasicUserData(data);

    // Check email conflicts
    if (data.email && EMAIL_REGEX.test(data.email.trim())) {
      const emailConflict = await this.checkEmailConflict(data.email, excludeUserId);
      if (emailConflict.isActiveConflict) {
        const conflictMessage = this.generateEmailConflictMessage(emailConflict, data.email);
        errors.push({ field: 'email', message: conflictMessage });
      }
    }

    return errors;
  }

  /**
   * Validate trainer data - simplified to email only
   */
  static async validateTrainerData(data: {
    name?: string;
    email?: string;
    contactNumber?: string;
    partnerOrganization?: string;
  }, excludeUserId?: string): Promise<ValidationError[]> {
    const errors = this.validateBasicUserData(data);

    // Check email conflicts
    if (data.email && EMAIL_REGEX.test(data.email.trim())) {
      const emailConflict = await this.checkEmailConflict(data.email, excludeUserId);
      if (emailConflict.isActiveConflict) {
        const conflictMessage = this.generateEmailConflictMessage(emailConflict, data.email);
        errors.push({ field: 'email', message: conflictMessage });
      }
    }

    return errors;
  }

  /**
   * Validate coordinator data - simplified to email only
   */
  static async validateCoordinatorData(data: {
    name?: string;
    email?: string;
    contactNumber?: string;
    partnerOrganization?: string;
  }, excludeUserId?: string): Promise<ValidationError[]> {
    const errors = this.validateBasicUserData(data);

    // Check email conflicts
    if (data.email && EMAIL_REGEX.test(data.email.trim())) {
      const emailConflict = await this.checkEmailConflict(data.email, excludeUserId);
      if (emailConflict.isActiveConflict) {
        const conflictMessage = this.generateEmailConflictMessage(emailConflict, data.email);
        errors.push({ field: 'email', message: conflictMessage });
      }
    }

    return errors;
  }
}
