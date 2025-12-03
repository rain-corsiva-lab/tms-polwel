// Universal Error Handler for consistent error messaging across all environments
// This ensures local, staging, and production behave identically

export interface ErrorInfo {
  title: string;
  message: string;
  variant: 'default' | 'destructive';
  actionable?: boolean;
}

/**
 * Extract error message from various error formats
 * Handles: string errors, Error objects, API response errors, nested error objects
 */
export const getErrorMessage = (error: any, fallback: string = 'An unexpected error occurred'): string => {
  if (!error) return fallback;
  
  // String error
  if (typeof error === 'string') return error;
  
  // Check for nested API response patterns first (most specific)
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.data?.message) return error.data.message;
  if (error?.data?.error) return error.data.error;
  
  // Check for direct error properties
  if (error?.message && typeof error.message === 'string' && error.message !== '[object Object]') {
    return error.message;
  }
  if (error?.error && typeof error.error === 'string') return error.error;
  
  // Check for details field (sometimes used in validation errors)
  if (error?.details && typeof error.details === 'string') return error.details;
  
  // Check for array of errors (validation errors)
  if (error?.errors && Array.isArray(error.errors) && error.errors.length > 0) {
    const messages = error.errors
      .map((e: any) => e?.message || e?.msg || (typeof e === 'string' ? e : null))
      .filter(Boolean);
    if (messages.length > 0) return messages.join('. ');
  }
  
  // Try toString if it gives useful info
  if (error?.toString && typeof error.toString === 'function') {
    const str = error.toString();
    if (str && str !== '[object Object]' && str !== 'Error' && !str.startsWith('[object')) {
      return str;
    }
  }
  
  return fallback;
};

/**
 * Parse any error and return consistent, user-friendly error information
 * This function works the same way in local, staging, and production
 */
export const parseError = (error: any, context?: string): ErrorInfo => {
  // Use the helper to extract error message
  const errorMessage = getErrorMessage(error, 'An unexpected error occurred');
  
  const errorName = error?.name || 'UnknownError';
  const lowerMessage = errorMessage.toLowerCase();
  
  // Network/Connection Errors
  if (errorName === 'NetworkError' || 
      lowerMessage.includes('failed to fetch') || 
      lowerMessage.includes('network') ||
      lowerMessage.includes('connection') ||
      lowerMessage.includes('cors')) {
    return {
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      variant: 'destructive',
      actionable: true
    };
  }
  
  // Authentication Errors
  if (errorName === 'AuthenticationError' ||
      lowerMessage.includes('unauthorized') || 
      lowerMessage.includes('authentication') ||
      lowerMessage.includes('session expired') ||
      lowerMessage.includes('token')) {
    return {
      title: 'Authentication Required',
      message: 'Your session has expired. Please log in again.',
      variant: 'destructive',
      actionable: true
    };
  }
  
  // Email Conflict Errors (specific to user management)
  if (lowerMessage.includes('already exists') || 
      lowerMessage.includes('already in use') ||
      lowerMessage.includes('email') && (lowerMessage.includes('duplicate') || lowerMessage.includes('exists'))) {
    return {
      title: 'Email Already Exists',
      message: context 
        ? `A ${context} with this email address already exists`
        : 'A user with this email address already exists',
      variant: 'destructive',
      actionable: true
    };
  }
  
  // General Validation Errors
  if (errorName === 'ValidationError' ||
      lowerMessage.includes('validation') ||
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('required') ||
      lowerMessage.includes('missing')) {
    return {
      title: 'Validation Error',
      message: errorMessage, // Keep specific validation message
      variant: 'destructive',
      actionable: true
    };
  }
  
  // Permission Errors
  if (errorName === 'PermissionError' ||
      lowerMessage.includes('forbidden') ||
      lowerMessage.includes('permission') ||
      lowerMessage.includes('access denied')) {
    return {
      title: 'Permission Denied',
      message: context 
        ? `You don't have permission to ${context}`
        : 'You do not have permission to perform this action.',
      variant: 'destructive',
      actionable: false
    };
  }
  
  // Not Found Errors
  if (errorName === 'NotFoundError' ||
      lowerMessage.includes('not found') ||
      lowerMessage.includes('404')) {
    return {
      title: 'Not Found',
      message: context 
        ? `${context} not found or no longer exists`
        : 'The requested resource was not found.',
      variant: 'destructive',
      actionable: true
    };
  }
  
  // Server Errors
  if (errorName === 'ServerError' ||
      lowerMessage.includes('internal server error') ||
      lowerMessage.includes('500') ||
      lowerMessage.includes('server error')) {
    return {
      title: 'Server Error',
      message: 'A server error occurred. Please try again later.',
      variant: 'destructive',
      actionable: true
    };
  }
  
  // Conflict Errors (general)
  if (errorName === 'ConflictError' ||
      lowerMessage.includes('conflict') ||
      lowerMessage.includes('duplicate') ||
      lowerMessage.includes('unique constraint')) {
    return {
      title: 'Conflict',
      message: errorMessage, // Keep specific conflict message
      variant: 'destructive',
      actionable: true
    };
  }
  
  // Default: Unknown error with helpful message
  return {
    title: 'Error',
    message: errorMessage || 'An unexpected error occurred. Please try again.',
    variant: 'destructive',
    actionable: true
  };
};

/**
 * Standardized error handler for React components
 * Use this in all catch blocks for consistent error handling
 */
export const handleError = (error: any, toast: any, context?: string) => {
  console.error(`Error in ${context || 'operation'}:`, error);
  
  const errorInfo = parseError(error, context);
  
  toast({
    title: errorInfo.title,
    description: errorInfo.message,
    variant: errorInfo.variant,
  });
  
  return errorInfo;
};

/**
 * Helper function for specific contexts
 */
export const createErrorHandler = (context: string) => {
  return (error: any, toast: any) => handleError(error, toast, context);
};

// Pre-configured error handlers for common operations
export const errorHandlers = {
  // User operations
  userUpdate: (error: any, toast: any) => handleError(error, toast, 'update user'),
  userCreate: (error: any, toast: any) => handleError(error, toast, 'create user'),
  userDelete: (error: any, toast: any) => handleError(error, toast, 'delete user'),
  
  // Trainer operations
  trainerUpdate: (error: any, toast: any) => handleError(error, toast, 'update trainer'),
  trainerCreate: (error: any, toast: any) => handleError(error, toast, 'create trainer'),
  trainerDelete: (error: any, toast: any) => handleError(error, toast, 'delete trainer'),
  trainerRestore: (error: any, toast: any) => handleError(error, toast, 'restore trainer'),
  
  // Partner operations
  partnerUpdate: (error: any, toast: any) => handleError(error, toast, 'update partner'),
  partnerCreate: (error: any, toast: any) => handleError(error, toast, 'create partner'),
  partnerDelete: (error: any, toast: any) => handleError(error, toast, 'delete partner'),
  partnerRestore: (error: any, toast: any) => handleError(error, toast, 'restore partner'),
  
  // Coordinator operations
  coordinatorUpdate: (error: any, toast: any) => handleError(error, toast, 'update coordinator'),
  coordinatorCreate: (error: any, toast: any) => handleError(error, toast, 'create coordinator'),
  coordinatorDelete: (error: any, toast: any) => handleError(error, toast, 'delete coordinator'),
  
  // Venue operations
  venueUpdate: (error: any, toast: any) => handleError(error, toast, 'update venue'),
  venueCreate: (error: any, toast: any) => handleError(error, toast, 'create venue'),
  venueDelete: (error: any, toast: any) => handleError(error, toast, 'delete venue'),
  venueRestore: (error: any, toast: any) => handleError(error, toast, 'restore venue'),
  venueLoad: (error: any, toast: any) => handleError(error, toast, 'load venue'),
  
  // Course operations
  courseUpdate: (error: any, toast: any) => handleError(error, toast, 'update course'),
  courseCreate: (error: any, toast: any) => handleError(error, toast, 'create course'),
  courseDelete: (error: any, toast: any) => handleError(error, toast, 'delete course'),
  courseLoad: (error: any, toast: any) => handleError(error, toast, 'load course'),
  
  // Course Run operations
  courseRunUpdate: (error: any, toast: any) => handleError(error, toast, 'update course run'),
  courseRunCreate: (error: any, toast: any) => handleError(error, toast, 'create course run'),
  courseRunDelete: (error: any, toast: any) => handleError(error, toast, 'delete course run'),
  courseRunLoad: (error: any, toast: any) => handleError(error, toast, 'load course run'),
  
  // Learner operations
  learnerUpdate: (error: any, toast: any) => handleError(error, toast, 'update learner'),
  learnerCreate: (error: any, toast: any) => handleError(error, toast, 'create learner'),
  learnerDelete: (error: any, toast: any) => handleError(error, toast, 'delete learner'),
  learnerImport: (error: any, toast: any) => handleError(error, toast, 'import learners'),
  
  // Organization operations
  organizationUpdate: (error: any, toast: any) => handleError(error, toast, 'update organization'),
  organizationCreate: (error: any, toast: any) => handleError(error, toast, 'create organization'),
  organizationDelete: (error: any, toast: any) => handleError(error, toast, 'delete organization'),
  organizationLoad: (error: any, toast: any) => handleError(error, toast, 'load organization'),
  
  // Profile operations
  profileUpdate: (error: any, toast: any) => handleError(error, toast, 'update profile'),
  profileLoad: (error: any, toast: any) => handleError(error, toast, 'load profile'),
  passwordChange: (error: any, toast: any) => handleError(error, toast, 'change password'),
  
  // Billing operations
  billingCreate: (error: any, toast: any) => handleError(error, toast, 'create billing'),
  billingUpdate: (error: any, toast: any) => handleError(error, toast, 'update billing'),
  billingLoad: (error: any, toast: any) => handleError(error, toast, 'load billing'),
  
  // Certificate operations
  certificateGenerate: (error: any, toast: any) => handleError(error, toast, 'generate certificate'),
  
  // Waiver operations
  waiverApprove: (error: any, toast: any) => handleError(error, toast, 'approve waiver'),
  waiverReject: (error: any, toast: any) => handleError(error, toast, 'reject waiver'),
  waiverLoad: (error: any, toast: any) => handleError(error, toast, 'load waiver'),
  
  // Generic operations
  dataLoad: (error: any, toast: any) => handleError(error, toast, 'load data'),
  dataSave: (error: any, toast: any) => handleError(error, toast, 'save data'),
  dataDelete: (error: any, toast: any) => handleError(error, toast, 'delete data'),
};

export default {
  parseError,
  handleError,
  createErrorHandler,
  errorHandlers,
  getErrorMessage,
};
