// Universal Error Handler for consistent error messaging across all environments
// This ensures local, staging, and production behave identically

export interface ErrorInfo {
  title: string;
  message: string;
  variant: 'default' | 'destructive';
  actionable?: boolean;
}

/**
 * Parse any error and return consistent, user-friendly error information
 * This function works the same way in local, staging, and production
 */
export const parseError = (error: any, context?: string): ErrorInfo => {
  const errorMessage = error?.message || error?.toString() || 'An unexpected error occurred';
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
  userUpdate: (error: any, toast: any) => handleError(error, toast, 'update user'),
  userCreate: (error: any, toast: any) => handleError(error, toast, 'create user'),
  trainerUpdate: (error: any, toast: any) => handleError(error, toast, 'update trainer'),
  trainerCreate: (error: any, toast: any) => handleError(error, toast, 'create trainer'),
  coordinatorUpdate: (error: any, toast: any) => handleError(error, toast, 'update coordinator'),
  coordinatorCreate: (error: any, toast: any) => handleError(error, toast, 'create coordinator'),
  partnerUpdate: (error: any, toast: any) => handleError(error, toast, 'update partner'),
  partnerCreate: (error: any, toast: any) => handleError(error, toast, 'create partner'),
};

export default {
  parseError,
  handleError,
  createErrorHandler,
  errorHandlers
};
