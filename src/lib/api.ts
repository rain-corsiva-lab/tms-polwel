// Error classification and user-friendly message mapping
import { toast } from 'sonner';
const classifyAndFormatError = (error: any, endpoint: string): Error => {
  const errorMessage = error.message || error.toString();
  const lowerMessage = errorMessage.toLowerCase();
  const original = error as any;
  const preserveProps = (target: any) => {
    const keys = ['status', 'code', 'data', 'details', 'conflicts'];
    for (const k of keys) {
      if (original && Object.prototype.hasOwnProperty.call(original, k)) {
        (target as any)[k] = (original as any)[k];
      }
    }
  };

  // PRIORITY 1: Check HTTP status codes first (more reliable than message text)
  
  // 500-599: Server Errors
  if (original?.status >= 500 && original?.status < 600) {
    const serverError = new Error(
      original?.data?.message || 
      original?.data?.error || 
      errorMessage || 
      'A server error occurred. Please try again later.'
    );
    serverError.name = 'ServerError';
    preserveProps(serverError);
    console.error('🔴 Server Error (5xx):', {
      status: original.status,
      endpoint,
      message: serverError.message,
      data: original.data
    });
    return serverError;
  }
  
  // 400-499: Client Errors (except 401/403 which are handled earlier)
  if (original?.status === 404) {
    const notFoundError = new Error('The requested resource was not found.');
    notFoundError.name = 'NotFoundError';
    preserveProps(notFoundError);
    return notFoundError;
  }
  
  if (original?.status === 409) {
    // Special handling: conflict details for trainer blockouts
    try {
      const d = original.data;
      let msg = d?.message || d?.error || errorMessage;
      if (d?.conflicts && Array.isArray(d.conflicts) && d.conflicts.length > 0) {
        const dates = d.conflicts
          .map((c: any) => (c.startDate === c.endDate ? c.startDate : `${c.startDate} to ${c.endDate}`))
          .slice(0, 5)
          .join(', ');
        if ((d.error || '').toLowerCase().includes('course')) {
          msg = `The selected dates conflict with scheduled courses. Please choose different dates or reschedule the conflicting courses.`;
        } else {
          msg = `The selected dates overlap with existing unavailable dates on: ${dates}. Please choose different dates or remove those blockouts first.`;
        }
      }
      const e = new Error(msg);
      e.name = 'ConflictError';
      preserveProps(e);
      return e;
    } catch {
      const conflictError = new Error(errorMessage);
      conflictError.name = 'ConflictError';
      preserveProps(conflictError);
      return conflictError;
    }
  }
  
  if (original?.status >= 400 && original?.status < 500) {
    // Generic 4xx client error
    const clientError = new Error(
      original?.data?.message || 
      original?.data?.error || 
      errorMessage
    );
    clientError.name = 'ClientError';
    preserveProps(clientError);
    return clientError;
  }
  
  // PRIORITY 2: Check message text for actual network/connection issues
  
  // True Network/Connection Errors (no HTTP response received)
  if (lowerMessage.includes('failed to fetch') || 
      lowerMessage.includes('network request failed') ||
      lowerMessage.includes('connection') ||
      lowerMessage.includes('cors') ||
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('timed out') ||
      lowerMessage.includes('aborted') ||
      lowerMessage.includes('certificate') ||
      lowerMessage.includes('ssl')) {
    const networkError = new Error('Unable to connect to the server. Please check your internet connection and try again.');
    networkError.name = 'NetworkError';
    preserveProps(networkError);
    console.error('🔴 Network Error:', {
      endpoint,
      originalMessage: errorMessage
    });
    return networkError;
  }
  
  // Authentication Errors
  if (lowerMessage.includes('unauthorized') || 
      lowerMessage.includes('authentication') ||
      lowerMessage.includes('token') ||
      lowerMessage.includes('session expired')) {
    const authError = new Error('Your session has expired. Please log in again.');
    authError.name = 'AuthenticationError';
    preserveProps(authError);
    return authError;
  }
  
  // Validation Errors
  if (lowerMessage.includes('validation') ||
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('required') ||
      lowerMessage.includes('missing')) {
    const validationError = new Error(errorMessage); // Keep original message for validation errors
    validationError.name = 'ValidationError';
    preserveProps(validationError);
    return validationError;
  }
  
  // Duplicate/Conflict Errors
  if (lowerMessage.includes('already exists') ||
      lowerMessage.includes('duplicate') ||
      lowerMessage.includes('conflict') ||
      lowerMessage.includes('unique constraint')) {
    const conflictError = new Error(errorMessage); // Keep original message for conflict errors
    conflictError.name = 'ConflictError';
    preserveProps(conflictError);
    return conflictError;
  }
  
  // Permission Errors
  if (lowerMessage.includes('forbidden') ||
      lowerMessage.includes('permission') ||
      lowerMessage.includes('access denied')) {
    const permissionError = new Error('You do not have permission to perform this action.');
    permissionError.name = 'PermissionError';
    preserveProps(permissionError);
    return permissionError;
  }
  
  // Not Found Errors
  if (lowerMessage.includes('not found') ||
      lowerMessage.includes('404')) {
    const notFoundError = new Error('The requested resource was not found.');
    notFoundError.name = 'NotFoundError';
    preserveProps(notFoundError);
    return notFoundError;
  }
  
  // Server Errors
  if (lowerMessage.includes('internal server error') ||
      lowerMessage.includes('500') ||
      lowerMessage.includes('server error')) {
    const serverError = new Error('A server error occurred. Please try again later.');
    serverError.name = 'ServerError';
    preserveProps(serverError);
    return serverError;
  }
  
  // Default: return original error but with consistent formatting
  const formattedError = new Error(errorMessage);
  formattedError.name = 'ApplicationError';
  preserveProps(formattedError);
  return formattedError;
};

// API Configuration - In dev mode, use relative path (Vite proxy); in prod, use environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
// const API_BASE_URL = import.meta.env.MODE === 'development' 
//   ? '/api'
//   : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

// Debug logging for environment
console.log('🔧 Environment Debug:', {
  mode: import.meta.env.MODE,
  nodeEnv: import.meta.env.VITE_NODE_ENV,
  apiUrl: import.meta.env.VITE_API_URL,
  resolvedApiUrl: API_BASE_URL,
  allEnvVars: import.meta.env
});

console.log('🌐 API Base URL:', API_BASE_URL);

// Get auth token from localStorage (matching the token key used in auth service)
import { authService } from './auth';
const getAuthToken = () => {
  return localStorage.getItem('polwel_access_token');
};

// Debug function to check auth state
export const debugAuthState = () => {
  const token = getAuthToken();
  const user = localStorage.getItem('polwel_user_data');
  
  console.log('Auth Debug State:', {
    hasToken: !!token,
    tokenLength: token?.length,
    tokenPreview: token ? `${token.substring(0, 20)}...` : null,
    hasUser: !!user,
    user: user ? JSON.parse(user) : null,
    localStorage: {
      polwel_access_token: !!localStorage.getItem('polwel_access_token'),
      polwel_refresh_token: !!localStorage.getItem('polwel_refresh_token'),
      polwel_user_data: !!localStorage.getItem('polwel_user_data'),
    }
  });
  
  return { hasToken: !!token, hasUser: !!user };
};

// API request helper with connection retry and fallback
const apiRequest = async (endpoint: string, options: RequestInit & { timeout?: number } = {}) => {
  const token = getAuthToken();

  const headers = new Headers(options.headers as HeadersInit | undefined);

  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!headers.has('Content-Type') && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Use custom timeout if provided, otherwise default to 30 seconds
  const timeoutMs = options.timeout || 30000;

  const config: RequestInit = {
    ...options,
    headers,
    // Add timeout and keep-alive settings
    signal: options.signal || AbortSignal.timeout(timeoutMs),
    keepalive: true, // Keep connection alive for better performance
  };

  // Try different approaches to handle connection issues
  const attempts = [
    () => fetch(`${API_BASE_URL}${endpoint}`, config),
    () => fetch(`${API_BASE_URL}${endpoint}`, { ...config, mode: 'cors' }),
  ];

  let lastError;

  for (let i = 0; i < attempts.length; i++) {
    try {
      console.log(`API Request attempt ${i + 1} for ${endpoint}`);
      const response = await attempts[i]();
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: 'Network error', 
          message: `HTTP error! status: ${response.status}` 
        }));
        
        // Handle specific authentication errors
        if (response.status === 401 || response.status === 403) {
          console.error(`Authentication Error (${response.status}):`, errorData);
          
          // Check if it's a token expiration error - attempt refresh once
          if (errorData.code === 'TOKEN_EXPIRED' || errorData.error?.includes('expired')) {
            try {
              const newToken = await authService.refreshToken();
              if (newToken) {
                // retry request with new token
                const retryConfig: RequestInit = {
                  ...config,
                  headers: {
                    ...config.headers,
                    Authorization: `Bearer ${newToken}`,
                  },
                };
                const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, retryConfig);
                if (retryResponse.ok) {
                  return retryResponse.json();
                }
                const rd = await retryResponse.json().catch(() => ({}));
                const err = new Error(rd.error || 'Request failed after token refresh');
                (err as any).status = retryResponse.status;
                throw err;
              }
              const err = new Error('Session expired. Please login again.');
              (err as any).status = 401;
              throw err;
            } catch (refreshErr) {
              const err = new Error('Session expired. Please login again.');
              (err as any).status = 401;
              throw err;
            }
          }

          // Non-expiry authentication errors: surface to caller without clearing tokens
          const authErr = new Error(errorData.error || errorData.message || 'Authentication failed');
          (authErr as any).status = response.status;
          (authErr as any).code = errorData.code;
          // If 403, annotate as PermissionError for UI toasts and optionally redirect
          if (response.status === 403) {
            (authErr as any).name = 'PermissionError';
            try {
              // soft redirect so current component can decide; keeps toast visible
              if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/403')) {
                // Allow component-level catch to show toast; devs can navigate to /403 as needed
              }
            } catch {}
          }
          throw authErr;
        }
        
  console.error(`API Error (${response.status}):`, errorData);
        
        // Format error message to include field-specific errors
        let errorMessage = errorData.message || errorData.error || response.statusText;
        
        // If there are validation errors, append them to the message
        if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          const fieldErrors = errorData.errors.map((err: any) => err.message).join('. ');
          errorMessage = `${errorMessage}. ${fieldErrors}`;
        }
        
        const httpError: any = new Error(errorMessage);
        httpError.status = response.status;
        httpError.code = errorData.code;
        httpError.data = errorData;
        throw httpError;
      }

      const data = await response.json();
      console.log(`API Success for ${endpoint}:`, data);
      return data;
    } catch (error) {
      // Classify and format the error consistently across all environments
  const classifiedError = classifyAndFormatError(error, endpoint);
      lastError = classifiedError;
      
      console.error(`API Request attempt ${i + 1} failed:`, {
        endpoint,
        errorName: classifiedError.name,
        errorMessage: classifiedError.message,
        errorStatus: (error as any)?.status,
        originalError: error.message,
        token: token ? 'Present' : 'Missing',
        apiBaseUrl: API_BASE_URL,
        environment: import.meta.env.MODE
      });
      
      // Don't retry on authentication errors
      if (classifiedError.name === 'AuthenticationError') {
        throw classifiedError;
      }
      
      // Don't retry on permission errors
      if (classifiedError.name === 'PermissionError') {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/403')) {
          window.history.replaceState(null, '', '/403');
        }
        throw classifiedError;
      }
      
      // Don't retry on server errors (500) - these need to be fixed on backend
      if (classifiedError.name === 'ServerError') {
        console.error('🔴 Server error detected - not retrying:', classifiedError.message);
        throw classifiedError;
      }
      
      // Don't retry on client errors (400, 404, 409, etc) - these are request issues
      if (classifiedError.name === 'ClientError' || 
          classifiedError.name === 'NotFoundError' ||
          classifiedError.name === 'ConflictError' ||
          classifiedError.name === 'ValidationError') {
        throw classifiedError;
      }
      
      // ONLY retry on TRUE network errors (connection failures)
      if (classifiedError.name === 'NetworkError') {
        if (i < attempts.length - 1) {
          const backoffDelay = Math.min(1000 * Math.pow(2, i), 3000); // Max 3 seconds
          console.log(`🔄 True network error detected, retrying in ${backoffDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        } else {
          // Final network error - throw user-friendly message
          console.error('❌ All network retry attempts failed');
          throw classifiedError;
        }
      }
      
      // For other errors, if this is the last attempt, throw the classified error
      if (i === attempts.length - 1) {
        throw classifiedError;
      }
    }
  }

  // For certain endpoints requiring authentication, don't provide fallback data
  const authRequiredEndpoints = [
    '/polwel-users',
    '/users',
    '/audit/',
    '/profile',
    '/organizations',
    '/courses',
    '/venues'
  ];
  
  const requiresAuth = authRequiredEndpoints.some(authEndpoint => 
    endpoint.includes(authEndpoint)
  );
  
  if (requiresAuth) {
    console.error('Authentication required endpoint failed, not using fallback data');
    throw lastError || new Error('Authentication required for this endpoint');
  }

  // Fallback data for non-authentication endpoints only
  console.error('All API attempts failed, using fallback data for:', endpoint);
  
  if (endpoint === '/references/categories') {
    return {
      success: true,
      data: {
        categories: [
          {
            name: "Self-Mastery",
            color: "bg-red-100 text-red-800 border-red-200",
            subcategories: ["Growth Mindset", "Personal Effectiveness", "Self-awareness"]
          },
          {
            name: "Thinking Skills",
            color: "bg-blue-100 text-blue-800 border-blue-200",
            subcategories: ["Agile Mindset", "Strategic Planning", "Critical Thinking & Creative Problem-Solving"]
          },
          {
            name: "People Skills",
            color: "bg-green-100 text-green-800 border-green-200",
            subcategories: ["Emotional Intelligence", "Collaboration", "Communication"]
          },
          {
            name: "Leadership Skills",
            color: "bg-yellow-100 text-yellow-800 border-yellow-200",
            subcategories: ["Mindful Leadership", "Empowerment", "Decision-making"]
          }
        ]
      }
    };
  }
  
  if (endpoint === '/references/trainers') {
    return {
      success: true,
      data: {
        trainers: [
          { id: '1', name: 'John Smith', email: 'john@example.com' },
          { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com' },
          { id: '3', name: 'Michael Brown', email: 'michael@example.com' }
        ]
      }
    };
  }
  
  if (endpoint === '/references/venues') {
    return {
      success: true,
      data: {
        venues: [
          { id: '1', name: 'Main Training Room', capacity: 25 },
          { id: '2', name: 'Conference Room A', capacity: 15 },
          { id: '3', name: 'Workshop Space', capacity: 20 }
        ]
      }
    };
  }
  
  if (endpoint === '/references/partners') {
    return {
      success: true,
      data: {
        partners: [
          { id: '1', name: 'Partner Organization A' },
          { id: '2', name: 'Partner Organization B' }
        ]
      }
    };
  }

  throw lastError;
};

// POLWEL Users API
export const polwelUsersApi = {
  // Get all POLWEL users with pagination and filtering
  getAll: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    all?: boolean;
    export?: boolean;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      if (typeof value === 'boolean') {
        if (value) {
          queryParams.append(key, 'true');
        }
        return;
      }
      let stringValue = value.toString();
      // normalize status to uppercase so backend can accept 'all' or 'ALL'
      if (key === 'status' && stringValue.length > 0) {
        stringValue = stringValue.toUpperCase();
      }
      if (stringValue.length === 0) {
        return;
      }
      queryParams.append(key, stringValue);
    });
    
    return apiRequest(`/polwel-users?${queryParams}`);
  },

  // Get POLWEL user by ID
  getById: async (id: string) => {
    return apiRequest(`/polwel-users/${id}`);
  },

  // Create new POLWEL user
  create: async (userData: {
    name: string;
    email: string;
    department?: string;
    permissionLevel?: string;
    permissions: string[];
  }) => {
    return apiRequest('/polwel-users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Update POLWEL user
  update: async (id: string, userData: {
    name?: string;
    email?: string;
    department?: string | null;
    permissionLevel?: string | null;
    permissions?: string[];
  }) => {
    return apiRequest(`/polwel-users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  // Delete POLWEL user (soft delete)
  delete: async (id: string) => {
    return apiRequest(`/polwel-users/${id}`, {
      method: 'DELETE',
    });
  },

  // Reset password
  resetPassword: async (id: string) => {
    return apiRequest(`/polwel-users/${id}/reset-password`, {
      method: 'POST',
    });
  },



  // Get detailed user information
  getDetails: async (id: string | number) => {
    return apiRequest(`/polwel-users/${id}/details`);
  },

  // Get user audit trail
  getAuditTrail: async (id: string | number) => {
    return apiRequest(`/polwel-users/${id}/audit-trail`);
  },

  // Send password reset link
  sendPasswordResetLink: async (id: string | number) => {
    return apiRequest(`/polwel-users/${id}/send-reset-link`, {
      method: 'POST',
    });
  },

  // Resend setup email
  resendSetup: async (id: string | number) => {
    return apiRequest(`/polwel-users/${id}/resend-setup`, {
      method: 'POST',
    });
  },

  // Update user status (ACTIVE/INACTIVE)
  updateStatus: async (id: string | number, status: 'ACTIVE' | 'INACTIVE') => {
    return apiRequest(`/polwel-users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  // Get all learners for an organization
  getLearners: async (organizationId: string) => {
    return apiRequest(`/client-organizations/${organizationId}/learners`);
  },
};

// Trainers API
export const trainersApi = {
  // Get all trainers with pagination and filtering
  getAll: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    all?: boolean;
    export?: boolean;
  // availabilityStatus deprecated; do not provide
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      if (typeof value === 'boolean') {
        if (value) {
          queryParams.append(key, 'true');
        }
        return;
      }
      const stringValue = value.toString();
      if (stringValue.length === 0) {
        return;
      }
      queryParams.append(key, stringValue);
    });
    
    return apiRequest(`/trainers?${queryParams}`);
  },

  // Get trainer by ID
  getById: async (id: string) => {
    return apiRequest(`/trainers/${id}`);
  },

  // Create new trainer
  create: async (trainerData: {
    name: string;
    email: string;
    status?: string;
    contactNumber?: string;
    onboardingDate?: string;
    partnerOrganization?: string;
    bio?: string;
    specializations?: string[];
    certifications?: string[];
    experience?: string;
  }) => {
    return apiRequest('/trainers', {
      method: 'POST',
      body: JSON.stringify(trainerData),
    });
  },

  // Update trainer
  update: async (id: string, trainerData: {
    name?: string;
    email?: string;
    status?: string;
    contactNumber?: string;
    onboardingDate?: string;
    partnerOrganization?: string;
    bio?: string;
    specializations?: string[];
    certifications?: string[];
    experience?: string;
  }) => {
    return apiRequest(`/trainers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(trainerData),
    });
  },

  // Delete trainer (soft delete)
  delete: async (id: string) => {
    return apiRequest(`/trainers/${id}`, {
      method: 'DELETE',
    });
  },

  // Get deleted trainers
  getDeleted: async (params: {
    page?: number;
    limit?: number;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    return apiRequest(`/trainers/deleted/all?${queryParams}`);
  },

  // Restore deleted trainer
  restore: async (id: string) => {
    return apiRequest(`/trainers/${id}/restore`, {
      method: 'PATCH',
    });
  },

  // Get trainer blockouts
  getBlockouts: async (id: string, params: {
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/trainers/${id}/blockouts?${queryParams}`);
  },

  // Create trainer blockout
  createBlockout: async (id: string, blockoutData: {
    date: string;
  // Remarks replace reason and are optional
  remarks?: string;
    type: string;
    description?: string;
    isRecurring?: boolean;
    recurringPattern?: string;
  }) => {
    return apiRequest(`/trainers/${id}/blockouts`, {
      method: 'POST',
      body: JSON.stringify(blockoutData),
    });
  },

  // Delete trainer blockout
  deleteBlockout: async (id: string, blockoutId: string) => {
    return apiRequest(`/trainers/${id}/blockouts/${blockoutId}`, {
      method: 'DELETE',
    });
  },

  // Get partner organizations
  getPartnerOrganizations: async (params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/trainers/partner-organizations?${queryParams}`);
  },

  getTrainingSummary: async (
    trainerId: string,
    params: { startDate?: string; endDate?: string; page?: number | string; limit?: number | string } = {}
  ) => {
    const query = new URLSearchParams();
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.page !== undefined) query.append('page', String(params.page));
    if (params.limit !== undefined) query.append('limit', String(params.limit));
    const queryString = query.toString();
    return apiRequest(`/trainers/${trainerId}/training-summary${queryString ? `?${queryString}` : ''}`);
  },

  // Resend setup email for trainer onboarding
  resendSetup: async (id: string) => {
    return apiRequest(`/trainers/${id}/resend-setup`, {
      method: 'POST',
    });
  },

  // List trainer fees
  getFees: async (trainerId: string) => {
    return apiRequest(`/trainers/${trainerId}/fees`);
  },
  // Create trainer fee
  createFee: async (trainerId: string, data: { courseId: string; feePerRun: number; remarks?: string }) => {
    return apiRequest(`/trainers/${trainerId}/fees`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  // Update trainer fee
  updateFee: async (trainerId: string, feeId: string, data: { feePerRun?: number; remarks?: string }) => {
    return apiRequest(`/trainers/${trainerId}/fees/${feeId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  // Delete trainer fee
  deleteFee: async (trainerId: string, feeId: string) => {
    return apiRequest(`/trainers/${trainerId}/fees/${feeId}`, {
      method: 'DELETE'
    });
  },
};

// Trainer Dashboard API (for authenticated trainers)
export const trainerDashboardApi = {
  // Get trainer dashboard data
  getDashboard: async () => {
    return apiRequest('/trainer/dashboard');
  },

  getCourseRuns: async (params: { startDate?: string; endDate?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    const queryString = query.toString();
    return apiRequest(`/trainer/course-runs${queryString ? `?${queryString}` : ''}`);
  },

  getTrainingSummary: async (params: { startDate?: string; endDate?: string; page?: number | string; limit?: number | string } = {}) => {
    const query = new URLSearchParams();
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.page !== undefined) query.append('page', String(params.page));
    if (params.limit !== undefined) query.append('limit', String(params.limit));
    const queryString = query.toString();
    return apiRequest(`/trainer/training-summary${queryString ? `?${queryString}` : ''}`);
  },

  // Update trainer profile
  updateProfile: async (profileData: {
    name?: string;
    contactNumber?: string;
    bio?: string;
    specializations?: string[];
    certifications?: string[];
    experience?: string;
  }) => {
    return apiRequest('/trainer/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
};

// Trainers API (admin context)
// extend trainersApi with training summary helper
(trainersApi as any).getTrainingSummary = async (
  trainerId: string,
  params: { startDate?: string; endDate?: string; page?: number | string; limit?: number | string } = {}
) => {
  const query = new URLSearchParams();
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.page !== undefined) query.append('page', String(params.page));
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  const queryString = query.toString();
  return apiRequest(`/trainers/${trainerId}/training-summary${queryString ? `?${queryString}` : ''}`);
};

// Dashboard metrics API (for POLWEL home counters)
export const dashboardApi = {
  getGlobalMetrics: async () => {
    return apiRequest('/dashboard/metrics');
  },
  getActionItems: async () => {
    return apiRequest('/dashboard/action-items');
  },
  getUpcomingRuns: async (date?: string) => {
    const params = date ? `?date=${date}` : '';
    return apiRequest(`/dashboard/upcoming-runs${params}`);
  },
  getCompletedRunsYTD: async () => {
    return apiRequest('/dashboard/completed-runs-ytd');
  },
  getCompletedRunTypes: async () => {
    return apiRequest('/dashboard/completed-run-types');
  },
  getCompletedByCategory: async () => {
    return apiRequest('/dashboard/completed-by-category');
  },
  getCompletionRate: async () => {
    return apiRequest('/dashboard/completion-rate');
  },
  getCancellationRates: async () => {
    return apiRequest('/dashboard/cancellation-rates');
  },
  getDraftRuns: async () => {
    return apiRequest('/dashboard/draft-runs');
  },
};

// Profile API for authenticated user (generic account profile)
export const profileApi = {
  get: async () => {
    return apiRequest('/profile');
  },
  update: async (profileData: {
    name?: string;
    contactNumber?: string;
    bio?: string;
  }) => {
    return apiRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }
  ,
  changePassword: async (payload: { currentPassword: string; newPassword: string }) => {
    return apiRequest('/profile/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
};

// Partners API
export const partnersApi = {
  // Get all partners with pagination and filtering
  getAll: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    all?: boolean;
    export?: boolean;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      if (typeof value === 'boolean') {
        if (value) {
          queryParams.append(key, 'true');
        }
        return;
      }
      const stringValue = value.toString();
      if (stringValue.length === 0) {
        return;
      }
      queryParams.append(key, stringValue);
    });
    
    return apiRequest(`/partners?${queryParams}`);
  },

  // Get partner by ID
  getById: async (id: string) => {
    return apiRequest(`/partners/${id}`);
  },

  // Create new partner (no email/password needed since partners are just data)
  create: async (partnerData: {
    partnerName: string;
    email?: string;
    coursesAssigned?: string[];
    pointOfContact?: string;
    pointOfContactDepartment?: string;
    pointOfContactEmail?: string;
    contactNumber?: string;
    contactDesignation?: string;
    onboardingDate?: string;
    status?: string;
    notes?: string;
    partnerOrganization?: string;
    bio?: string;
    experience?: string;
  }) => {
    return apiRequest('/partners', {
      method: 'POST',
      body: JSON.stringify(partnerData),
    });
  },

  // Update partner
  update: async (id: string, partnerData: {
    partnerName?: string;
    email?: string;
    coursesAssigned?: string[];
    pointOfContact?: string;
    pointOfContactDepartment?: string;
    pointOfContactEmail?: string;
    contactNumber?: string;
    contactDesignation?: string;
    status?: string;
    onboardingDate?: string;
    notes?: string;
    partnerOrganization?: string;
    bio?: string;
    experience?: string;
  }) => {
    return apiRequest(`/partners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(partnerData),
    });
  },

  // Delete partner (soft delete)
  delete: async (id: string) => {
    return apiRequest(`/partners/${id}`, {
      method: 'DELETE',
    });
  },

  // Get deleted partners
  getDeleted: async (params: {
    page?: number;
    limit?: number;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    return apiRequest(`/partners/deleted/all?${queryParams}`);
  },

  // Restore deleted partner
  restore: async (id: string) => {
    return apiRequest(`/partners/${id}/restore`, {
      method: 'PATCH',
    });
  },

  // Get partner statistics
  getStatistics: async () => {
    return apiRequest('/partners/statistics');
  },
};

// Client Organisations API
export const clientOrganizationsApi = {
  // Get all organisations with pagination and filtering
  getAll: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  organizationType?: string;
  all?: boolean;
  export?: boolean;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      if (typeof value === 'boolean') {
        if (value) {
          queryParams.append(key, 'true');
        }
        return;
      }
      const stringValue = value.toString();
      if (stringValue.length === 0) {
        return;
      }
      queryParams.append(key, stringValue);
    });
    
    return apiRequest(`/client-organizations?${queryParams}`);
  },

  // Get all learners irrespective of organization
  getAllLearners: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    organizationId?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    return apiRequest(`/client-organizations/learners?${queryParams}`);
  },

  // Get organization by ID
  getById: async (id: string) => {
    return apiRequest(`/client-organizations/${id}`);
  },

  // Create new organization
  create: async (orgData: {
    name: string;
    status?: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactPerson?: string;
    buNumber?: string;
  organizationType?: string;
  }) => {
    return apiRequest('/client-organizations', {
      method: 'POST',
      body: JSON.stringify(orgData),
    });
  },

  // Update organization
  update: async (id: string, orgData: {
    name?: string;
    status?: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactPerson?: string;
    buNumber?: string;
  organizationType?: string;
  }) => {
    return apiRequest(`/client-organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orgData),
    });
  },

  // Delete organization (soft delete)
  delete: async (id: string) => {
    return apiRequest(`/client-organizations/${id}`, {
      method: 'DELETE',
    });
  },

  // Get organization statistics
  getStats: async () => {
    return apiRequest('/client-organizations/stats');
  },

  // Get all industries
  getIndustries: async () => {
    return apiRequest('/client-organizations/industries');
  },

  // ============ TRAINING COORDINATORS ============
  
  // Get coordinators for an organization
  getCoordinators: async (organizationId: string, params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      let stringValue = value.toString();
      if (key === 'status' && stringValue.length > 0) stringValue = stringValue.toUpperCase();
      if (stringValue !== '') {
        queryParams.append(key, stringValue);
      }
    });
    
    return apiRequest(`/client-organizations/${organizationId}/coordinators?${queryParams}`);
  },

  // Create coordinator for an organization
  createCoordinator: async (
    organizationId: string,
    coordinatorData: {
      name: string;
      email: string;
      contactNumber: string;
      designation?: string;
      password: string;
      isPrimary?: boolean;
    }
  ) => {
    return apiRequest(`/client-organizations/${organizationId}/coordinators`, {
      method: 'POST',
      body: JSON.stringify(coordinatorData),
    });
  },

  // Update coordinator
  updateCoordinator: async (
    organizationId: string,
    coordinatorId: string,
    coordinatorData: {
      name?: string;
      email?: string;
      contactNumber?: string | null;
      designation?: string;
      status?: string;
      isPrimary?: boolean;
    }
  ) => {
    return apiRequest(`/client-organizations/${organizationId}/coordinators/${coordinatorId}`, {
      method: 'PUT',
      body: JSON.stringify(coordinatorData),
    });
  },

  // Delete coordinator (soft delete)
  deleteCoordinator: async (organizationId: string, coordinatorId: string) => {
    return apiRequest(`/client-organizations/${organizationId}/coordinators/${coordinatorId}`, {
      method: 'DELETE',
    });
  },

  // Resend setup email for coordinator onboarding
  resendCoordinatorSetup: async (organizationId: string, coordinatorId: string) => {
    return apiRequest(`/client-organizations/${organizationId}/coordinators/${coordinatorId}/resend-setup`, {
      method: 'POST',
    });
  },

  // ============ LEARNERS ============
  
  // Get learners for an organization
  getLearners: async (organizationId: string, params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/client-organizations/${organizationId}/learners?${queryParams}`);
  },

  // Get organization enrollments (course run learners)
  getEnrollments: async (organizationId: string, params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/organizations/${organizationId}/enrollments?${queryParams}`);
  },

  // ============ COORDINATOR SELF-SERVICE ============
  
  // Get coordinator's course runs (filtered to their learners)
  getCoordinatorCourseRuns: async (organizationId: string) => {
    return apiRequest(`/client-organizations/${organizationId}/coordinator/course-runs`);
  },

  // Get coordinator's learners
  getCoordinatorLearners: async (organizationId: string, params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/client-organizations/${organizationId}/coordinator/learners?${queryParams}`);
  },

  // Get learners for a specific course run (optionally filtered by coordinator or organization)
  getCourseRunLearners: async (courseRunId: string, filterById?: string) => {
    const params = new URLSearchParams();
    if (filterById) {
      params.append('coordinatorId', filterById);
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/course-runs/${courseRunId}/learners${queryString}`);
  },

  // ============ COORDINATOR ANALYTICS & RESOURCES ============
  
  // Get resource library items for coordinator
  getResources: async (organizationId: string) => {
    return apiRequest(`/client-organizations/${organizationId}/resources`);
  },

  // Get courses ranked by number of learners
  getCoursesByLearnersRanking: async (organizationId: string) => {
    return apiRequest(`/client-organizations/${organizationId}/analytics/courses-by-learners`);
  },

  // Get divisions ranked by number of learners
  getDivisionsByLearnersRanking: async (organizationId: string) => {
    return apiRequest(`/client-organizations/${organizationId}/analytics/divisions-by-learners`);
  },

  // BU Number options
  getBuNumbers: async (): Promise<string[]> => {
    const res = await apiRequest('/client-organizations/bu-numbers');
    return res?.buNumbers ?? [];
  },

  createBuNumber: async (value: string) => {
    return apiRequest('/client-organizations/bu-numbers', {
      method: 'POST',
      body: JSON.stringify({ value }),
    });
  },
};

// Organizations API (general)
export const organizationsApi = {
  // Get all organizations with optional type filter
  list: async (params: { type?: string; status?: string } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.type) queryParams.append('type', params.type);
    if (params.status) queryParams.append('status', params.status);
    return apiRequest(`/organizations?${queryParams}`);
  },

  // Get single organization
  getById: async (id: string) => {
    return apiRequest(`/organizations/${id}`);
  },

  // Get training coordinators for an organization
  getTrainingCoordinators: async (organizationId: string) => {
    return apiRequest(`/organizations/${organizationId}/training-coordinators`);
  },
};

// Course related types
export interface CourseDiscount { id?: string; name: string; percentage: number; }
export interface Course {
  id?: string;
  courseCode?: string;
  title: string;
  description?: string;
  objectives?: string[];
  duration: string;
  durationType?: string;
  maxParticipants?: number;
  minParticipants?: number;
  category?: string;
  level?: string;
  prerequisites?: string[];
  materials?: string[];
  venueFee?: number; // Venue expenses
  venue?: string;
  venueId?: string;
  venueType?: string;
  specifiedLocation?: string;
  trainers?: string[];
  certificates?: string;
  remarks?: string;
  targetAudience?: string;
  syllabus?: string;
  assessmentMethod?: string;
  certificationType?: string;
  defaultCourseFee?: number;
  discounts?: CourseDiscount[];
  billingRate?: number;
  contractsFeePayout?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type CourseCreatePayload = Omit<Course, 'id' | 'createdAt' | 'updatedAt'>;
export type CourseUpdatePayload = Partial<CourseCreatePayload>;

// Courses API
export const coursesApi = {
  // Get all courses with filtering and pagination
  getAll: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    certificates?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/courses?${queryString}` : '/courses';
    
    return apiRequest(endpoint);
  },

  // Get course by ID
  getById: async (id: string | number) => {
    return apiRequest(`/courses/${id}`);
  },

  // Create new course
  create: async (courseData: CourseCreatePayload) => {
    return apiRequest('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  },

  // Update course
  update: async (id: string | number, courseData: CourseUpdatePayload) => {
    return apiRequest(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  },

  // Delete course
  delete: async (id: string | number) => {
    return apiRequest(`/courses/${id}`, {
      method: 'DELETE',
    });
  },

  // Toggle course status
  toggleStatus: async (id: string | number) => {
    return apiRequest(`/courses/${id}/toggle-status`, {
      method: 'PATCH',
    });
  },

  // Get course statistics
  getStatistics: async () => {
    return apiRequest('/courses/statistics');
  },

  // Export course run history as Excel
  exportRunHistory: async (id: string | number) => {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }
    
    const response = await fetch(`${API_BASE_URL}/courses/${id}/runs/export`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to export course run history' }));
      throw new Error(errorData.message || 'Failed to export course run history');
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `Course_Run_History_${id}.xlsx`;
    
    if (contentDisposition) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '');
      }
    }

    // Get the blob data
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return { success: true, message: 'Export successful' };
  },
};

// Course Runs API
export const courseRunsApi = {
  // Dedicated endpoint for Post Run Management - bypasses caching issues
  getPostCourseRuns: async (params: {
    statuses?: string;
    search?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/course-runs/post-management?${queryString}` : '/course-runs/post-management';

    return apiRequest(endpoint, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  },

  getAll: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/course-runs?${queryString}` : '/course-runs';

    return apiRequest(endpoint, {
      cache: 'no-store', // Prevent 304 Not Modified caching issues
    });
  },

  getById: async (id: string) => {
    return apiRequest(`/course-runs/${id}`);
  },

  create: async (courseRunData: any) => {
    return apiRequest('/course-runs', {
      method: 'POST',
      body: JSON.stringify(courseRunData),
    });
  },

  // Duplicate a course run from a past run
  duplicate: async (payload: {
    courseRunId: string;
    startDatetime: string;
    endDatetime: string;
  }) => {
    return apiRequest('/course-runs/duplicate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (id: string, courseRunData: any) => {
    return apiRequest(`/course-runs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courseRunData),
    });
  },

  getStatusOptions: async () => {
    return apiRequest('/course-runs/status-options');
  },

  previewCourseCancellationEmail: async (
    id: string,
    payload?: { reason?: string; nextRunDate?: string; additionalNotes?: string }
  ) => {
    return apiRequest(`/course-runs/${id}/course-cancellation-email/preview`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    });
  },

  cancel: async (
    id: string,
    payload?: { reason?: string; nextRunDate?: string; additionalNotes?: string; attachmentMediaIds?: string[] }
  ) => {
    return apiRequest(`/course-runs/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    });
  },

  getWorkflowState: async (id: string) => {
    return apiRequest(`/course-runs/${id}/workflow`);
  },

  // Public endpoint — no auth required. Returns the current workflow timing mode
  // so the frontend can display a testing-mode banner.
  getWorkflowMode: async (): Promise<{
    success: boolean;
    isTestingMode: boolean;
    environment: string;
    cronSchedule: string;
    transitionRule: string;
  }> => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const res = await fetch(`${base}/course-runs/workflow-mode`);
    if (!res.ok) throw new Error('Failed to fetch workflow mode');
    return res.json();
  },

  performWorkflowAction: async (
    id: string,
    payload: {
      action: string;
      sendEmails?: boolean;
    }
  ) => {
    return apiRequest(`/course-runs/${id}/workflow/action`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/course-runs/${id}`, {
      method: 'DELETE',
    });
  },

  exportToCSV: async () => {
    return apiRequest('/course-runs/export/csv');
  },

  // Enroll single learner (backend expects /enroll-learner)
  enrollLearner: async (courseRunId: string, enrollmentData: any) => {
    return apiRequest(`/course-runs/${courseRunId}/enroll-learner`, {
      method: 'POST',
      body: JSON.stringify(enrollmentData),
    });
  },

  // Enroll multiple learners (group) (backend expects /enroll-learners)
  enrollLearners: async (courseRunId: string, enrollmentData: any) => {
    return apiRequest(`/course-runs/${courseRunId}/enroll-learners`, {
      method: 'POST',
      body: JSON.stringify(enrollmentData),
    });
  },

  // Import learners from uploaded file
  importLearners: async (courseRunId: string, payload: any) => {
    return apiRequest(`/course-runs/${courseRunId}/import-learners`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Get enrolled learners for a course run
  getLearners: async (courseRunId: string) => {
    return apiRequest(`/course-runs/${courseRunId}/learners`);
  },

  // Get latest enrollment for a learner (for auto-fill)
  getLatestEnrollmentByLearner: async (learnerId: string) => {
    return apiRequest(`/course-runs/learners/${learnerId}/latest-enrollment`);
  },

  // Get attendance snapshot for a course run
  getAttendance: async (courseRunId: string) => {
    return apiRequest(`/course-runs/${courseRunId}/attendance`);
  },

  // Save attendance for a specific day
  saveAttendance: async (
    courseRunId: string,
    payload: {
      day: number;
      records: Array<{ learnerId: string; attendAM?: boolean; attendPM?: boolean }>;
    }
  ) => {
    return apiRequest(`/course-runs/${courseRunId}/attendance`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // Update learner enrollment
  updateEnrollment: async (courseRunId: string, learnerId: string, payload: any) => {
    return apiRequest(`/course-runs/${courseRunId}/learners/${learnerId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // Remove learner from course run (soft delete)
  removeLearner: async (courseRunId: string, learnerId: string) => {
    return apiRequest(`/course-runs/${courseRunId}/learners/${learnerId}`, {
      method: 'DELETE',
    });
  },

  // Resend confirmation email to a specific learner
  resendLearnerConfirmation: async (courseRunId: string, learnerId: string) => {
    return apiRequest(`/course-runs/${courseRunId}/learners/${learnerId}/resend-confirmation`, {
      method: 'POST',
    });
  },

  // Withdraw a learner from the course run
  withdrawLearner: async (
    courseRunId: string,
    learnerId: string,
    payload: {
      reason: string;
      supportingDocument?: {
        filename: string;
        mimetype?: string;
        size?: number;
        base64?: string;
      };
    }
  ) => {
    return apiRequest(`/course-runs/${courseRunId}/learners/${learnerId}/withdraw`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Update trainer assignments
  updateTrainerAssignments: async (courseRunId: string, trainers: Array<{trainerId: string; trainerBaseAmount: number}>) => {
    return apiRequest(`/course-runs/${courseRunId}/trainer-assignments`, {
      method: 'PUT',
      body: JSON.stringify({ trainers }),
    });
  },

  updatePartnerAssignments: async (courseRunId: string, partners: Array<{partnerId: string}>) => {
    return apiRequest(`/course-runs/${courseRunId}/partner-assignments`, {
      method: 'PUT',
      body: JSON.stringify({ partners }),
    });
  },

  // Mark course run as confirmed (PENDING → CONFIRMED_PENDING_TA_APPROVAL)
  markAsConfirmed: async (courseRunId: string) => {
    return apiRequest(`/course-runs/${courseRunId}/mark-confirmed`, {
      method: 'POST',
    });
  },

  // Approve trainer assignment (CONFIRMED_PENDING_TA_APPROVAL → CONFIRMED_PENDING_CONFIRMATION_EMAILS)
  approveTrainerAssignment: async (courseRunId: string) => {
    return apiRequest(`/course-runs/${courseRunId}/approve-trainer-assignment`, {
      method: 'POST',
    });
  },

  // Reject trainer assignment (stays at CONFIRMED_PENDING_TA_APPROVAL)
  rejectTrainerAssignment: async (courseRunId: string, payload: { rejectionReason: string }) => {
    return apiRequest(`/course-runs/${courseRunId}/reject-trainer-assignment`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** HTML + subject preview — same template as the sent email (does not send). */
  previewCourseConfirmationEmail: async (
    courseRunId: string,
    payload: { additionalBody?: string }
  ) => {
    return apiRequest(`/course-runs/${courseRunId}/course-confirmation-email/preview`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Send course confirmation email to learners
  sendCourseConfirmationEmail: async (
    courseRunId: string,
    payload: { learnerIds?: string[]; ccEmails?: string[]; additionalBody?: string; attachmentIds?: string[] }
  ) => {
    return apiRequest(`/course-runs/${courseRunId}/send-course-confirmation-email`, {
      method: 'POST',
      body: JSON.stringify(payload),
      timeout: 120000, // 120 seconds for email operations with attachments
    });
  },

  // Send training assignment email to both learners and trainers (transitions to CONFIRMED)
  sendTrainingAssignmentEmailToLearners: async (courseRunId: string) => {
    return apiRequest(`/course-runs/${courseRunId}/send-training-assignment-email-learners`, {
      method: 'POST',
    });
  },

  /** Trainer/partner assignment email HTML preview (same template as send). */
  previewTrainerAssignmentEmail: async (
    courseRunId: string,
    payload: {
      additionalBody?: string;
      recipientType?: 'trainer' | 'partner';
      /** Prefer this — matches `trainers[].id` from the UI (trainer entity id). */
      trainerId?: string;
      courseRunTrainerId?: string;
    }
  ) => {
    return apiRequest(`/course-runs/${courseRunId}/trainer-assignment-email/preview`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Send trainer assignment emails with optional CC and additional body
  sendTrainerAssignmentEmail: async (
    courseRunId: string,
    payload: { ccEmails?: string[]; additionalBody?: string }
  ) => {
    return apiRequest(`/course-runs/${courseRunId}/send-trainer-assignment-email`, {
      method: 'POST',
      body: JSON.stringify(payload),
      timeout: 120000, // 120 seconds for email operations with attachments
    });
  },

  // Save billing information
  saveBilling: async (payload: any) => {
    return apiRequest(`/course-runs/billing`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Get billing export data
  getBillingExport: async (courseRunId: string) => {
    return apiRequest(`/course-runs/${courseRunId}/billing-export`);
  },

  // Get certificate data for learners
  getCertificates: async (courseRunId: string) => {
    return apiRequest(`/course-runs/${courseRunId}/certificates`);
  },

  // Send certificates via email to selected learners
  sendCertificatesToLearners: async (courseRunId: string, learnerIds: string[]) => {
    return apiRequest(`/course-runs/${courseRunId}/certificates/send`, {
      method: 'POST',
      body: JSON.stringify({ learnerIds }),
      timeout: 120000, // 120 seconds for email operations with attachments
    });
  },

  previewCertificateEmail: async (courseRunId: string) => {
    return apiRequest(`/course-runs/${courseRunId}/certificates/email-preview`, {
      method: 'POST',
    });
  },

  // Submit waiver form for absent learner
  submitWaiver: async (courseRunId: string, enrollmentId: string, payload: any) => {
    return apiRequest(`/course-runs/${courseRunId}/learners/${enrollmentId}/waiver`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// Define venue interfaces
export interface Contact {
  id: string;
  name: string;
  number: string;
  email: string;
}

export interface Venue {
  id: string;
  name: string;
  capacity: string;
  fee: number;
  maxParticipants?: number;
  perHeadPriceIfMaxExceed?: number;
  contacts: Contact[];
  remarks: string;
  status?: string;
  address?: string;
  description?: string;
  facilities?: string[];
  venueType?: string;
  createdAt?: string;
  updatedAt?: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  bookingCount?: number;
  courseRunCount?: number;
}

export interface VenueCreateRequest {
  name: string;
  capacity?: string;
  address?: string;
  description?: string;
  facilities?: string[];
  contacts: Contact[];
  fee: number;
  maxParticipants?: number;
  perHeadPriceIfMaxExceed?: number;
  status?: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  remarks?: string;
  venueType?: "HOTEL" | "ON_PREMISE" | "CLIENT_FACILITY" | "ONLINE";
}

// Venues API
export const venuesApi = {
  // Get all venues
  getAll: async (params?: { search?: string; status?: string; venueType?: string; page?: number; limit?: number | 'all'; export?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.venueType) queryParams.append('venueType', params.venueType);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.export) queryParams.append('export', 'true');
    
    const queryString = queryParams.toString();
    return apiRequest(`/venues${queryString ? `?${queryString}` : ''}`);
  },

  // Get venue by ID
  getById: async (id: string) => {
    return apiRequest(`/venues/${id}`);
  },

  // Create new venue
  create: async (venueData: VenueCreateRequest) => {
    return apiRequest('/venues', {
      method: 'POST',
      body: JSON.stringify(venueData),
    });
  },

  // Update venue
  update: async (id: string, venueData: VenueCreateRequest) => {
    return apiRequest(`/venues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(venueData),
    });
  },

  // Delete venue
  delete: async (id: string) => {
    return apiRequest(`/venues/${id}`, {
      method: 'DELETE',
    });
  },

  // Toggle venue status
  updateStatus: async (id: string, status: string) => {
    return apiRequest(`/venues/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

// References API
export const referencesApi = {
  // Get all trainers
  getTrainers: async () => {
    return apiRequest('/references/trainers');
  },

  // Get all partners
  getPartners: async () => {
    return apiRequest('/references/partners');
  },

  // Get all venues
  getVenues: async () => {
    return apiRequest('/references/venues');
  },

  // Get categories
  getCategories: async () => {
    return apiRequest('/references/categories');
  },
};

// Trainer Blockouts API
export const trainerBlockoutsApi = {
  // Get all blockouts for a trainer
  async getByTrainerId(trainerId: string, startDate?: string, endDate?: string) {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    
    const queryString = queryParams.toString();
    const endpoint = `/trainer-blockouts/trainer/${trainerId}/blockouts${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Create a new blockout
  async create(blockoutData: {
    trainerId: string;
    startDate: string;
    endDate: string;
    // Remarks replace reason and are optional
    remarks?: string;
    description?: string;
    isRecurring?: boolean;
    recurringPattern?: string;
  }) {
    return apiRequest('/trainer-blockouts/blockouts', {
      method: 'POST',
      body: JSON.stringify(blockoutData),
    });
  },

  // Update a blockout
  async update(blockoutId: string, updateData: {
    startDate?: string;
    endDate?: string;
  remarks?: string | null;
    description?: string;
    isRecurring?: boolean;
    recurringPattern?: string;
  }) {
    return apiRequest(`/trainer-blockouts/blockouts/${blockoutId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  // Delete a blockout
  async delete(blockoutId: string) {
    return apiRequest(`/trainer-blockouts/blockouts/${blockoutId}`, {
      method: 'DELETE',
    });
  },

  // Get blockout by ID
  async getById(blockoutId: string) {
    return apiRequest(`/trainer-blockouts/blockouts/${blockoutId}`, {
      method: 'GET',
    });
  },

  // Get calendar view
  async getCalendarView(trainerId: string, startDate?: string, endDate?: string, view: string = 'month') {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    queryParams.append('view', view);
    
    const queryString = queryParams.toString();
    const endpoint = `/trainer-blockouts/trainer/${trainerId}/calendar${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest(endpoint, { method: 'GET' });
  },
};

// Trainer Course Runs API
export const getTrainerCourseRuns = async (trainerId: string) => {
  return apiRequest(`/trainers/${trainerId}/course-runs`, { method: 'GET' });
};

// Individual trainer blockout function exports for convenience
export const getTrainerBlockouts = trainerBlockoutsApi.getByTrainerId;
export const createTrainerBlockout = trainerBlockoutsApi.create;
export const updateTrainerBlockout = trainerBlockoutsApi.update;
export const deleteTrainerBlockout = trainerBlockoutsApi.delete;

// Billing Reports API
export const billingReportsApi = {
  /**
   * Get all billing reports with optional filtering
   */
  list: async (params?: { search?: string; startMonth?: string; endMonth?: string }) => {
    const query = new URLSearchParams();
    if (params) {
      if (params.search) query.append('search', params.search);
      if (params.startMonth) query.append('startMonth', params.startMonth);
      if (params.endMonth) query.append('endMonth', params.endMonth);
    }
    const queryString = query.toString();
    return apiRequest(`/billing-reports${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
  },

  /**
   * Get specific billing report detail
   */
  detail: async (id: string) => {
    return apiRequest(`/billing-reports/${id}`, { method: 'GET' });
  },

  /**
   * Export consolidated billing report to XLSX
   */
  exportConsolidated: async (id: string) => {
    return apiRequest(`/billing-reports/${id}/export`, { method: 'GET' });
  },
};

// Waiver Requests API
export const waiversApi = {
  /**
   * Get all waiver requests with pagination and filtering
   */
  getAll: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    organizationId?: string;
    courseId?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    const queryString = queryParams.toString();
    return apiRequest(`/waivers${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get a single waiver request by ID
   */
  getById: async (id: string) => {
    return apiRequest(`/waivers/${id}`);
  },

  /**
   * Get waiver supporting document info
   */
  getDocument: async (id: string) => {
    return apiRequest(`/waivers/${id}/document`);
  },

  /**
   * Approve a waiver request
   */
  approve: async (id: string, reason?: string) => {
    return apiRequest(`/waivers/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Reject a waiver request (reason required)
   */
  reject: async (id: string, reason: string) => {
    return apiRequest(`/waivers/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};

// Resource Library API
export const resourceLibraryApi = {
  getAll: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    targetAudience?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/resource-library?${queryString}` : '/resource-library';
    
    return apiRequest(endpoint);
  },

  getById: async (id: string) => {
    return apiRequest(`/resource-library/${id}`);
  },

  create: async (
    data:
      | FormData
      | {
          title: string;
          description?: string;
          fileName: string;
          fileUrl: string;
          fileSize?: number;
          mimeType?: string;
          imageUrl?: string | null;
          imageName?: string | null;
          imageSize?: number | null;
          targetAudience?: string;
          status?: string;
        },
  ) => {
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      return apiRequest('/resource-library', {
        method: 'POST',
        body: data,
        timeout: 120000,
      });
    }
    return apiRequest('/resource-library', {
      method: 'POST',
      body: JSON.stringify(data),
      timeout: 30000,
    });
  },

  update: async (
    id: string,
    data:
      | FormData
      | {
          title?: string;
          description?: string;
          fileName?: string;
          fileUrl?: string;
          fileSize?: number;
          mimeType?: string;
          imageUrl?: string | null;
          imageName?: string | null;
          imageSize?: number | null;
          targetAudience?: string;
          status?: string;
        },
  ) => {
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      return apiRequest(`/resource-library/${id}`, {
        method: 'PUT',
        body: data,
        timeout: 120000,
      });
    }
    return apiRequest(`/resource-library/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      timeout: 30000,
    });
  },

  updateStatus: async (id: string, status: string) => {
    return apiRequest(`/resource-library/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/resource-library/${id}`, {
      method: 'DELETE',
    });
  },
};

// Reporting API
export const reportingApi = {
  getBoardReport: async (year?: number) => {
    const params = year ? `?year=${year}` : '';
    return apiRequest(`/reporting/board-report${params}`);
  },

  getBoardReportAll: async () => {
    return apiRequest('/reporting/board-report-all');
  },

  getQuarterDetails: async (quarter: string, year: number) => {
    return apiRequest(`/reporting/quarter-details?quarter=${quarter}&year=${year}`);
  },

  getRunsByOrganisation: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    organizationId?: string;
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.organizationId) queryParams.append('organizationId', params.organizationId);
    if (params.status) queryParams.append('status', params.status);
    return apiRequest(`/reporting/runs-by-organisation?${queryParams}`);
  },

  getRunsByTrainer: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    trainerId?: string;
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.trainerId) queryParams.append('trainerId', params.trainerId);
    if (params.status) queryParams.append('status', params.status);
    return apiRequest(`/reporting/runs-by-trainer?${queryParams}`);
  },

  getRunsByStatus: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    organizationId?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.organizationId) queryParams.append('organizationId', params.organizationId);
    return apiRequest(`/reporting/runs-by-status?${queryParams}`);
  },

  getRunsByPeriod: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.status) queryParams.append('status', params.status);
    return apiRequest(`/reporting/runs-by-period?${queryParams}`);
  },

  getRunsByVenue: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    venueId?: string;
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.venueId) queryParams.append('venueId', params.venueId);
    if (params.status) queryParams.append('status', params.status);
    return apiRequest(`/reporting/runs-by-venue?${queryParams}`);
  },

  getRunDetails: async (id: string) => {
    return apiRequest(`/reporting/run-details/${id}`);
  },

  getFilterOptions: async () => {
    return apiRequest('/reporting/filter-options');
  },
};

export {
  API_BASE_URL,
};

export default {
  polwelUsersApi,
  trainersApi,
  partnersApi,
  clientOrganizationsApi,
  organizationsApi,
  courseRunsApi,
  coursesApi,
  venuesApi,
  referencesApi,
  trainerDashboardApi,
  billingReportsApi,
  waiversApi,
  resourceLibraryApi,
  reportingApi,
};
