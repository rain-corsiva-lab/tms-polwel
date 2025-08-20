// API Configuration - Use environment variable or fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  // Try different approaches to handle connection issues
  const attempts = [
    () => fetch(`${API_BASE_URL}${endpoint}`, config),
    () => fetch(`${API_BASE_URL}${endpoint}`, { ...config, mode: 'cors' }),
    () => fetch(`http://127.0.0.1:3001/api${endpoint}`, config),
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
          
          // Check if it's a token expiration error
          if (errorData.code === 'TOKEN_EXPIRED' || errorData.error?.includes('expired')) {
            console.log('Token expired detected in API, clearing tokens and redirecting...');
            localStorage.removeItem('polwel_access_token');
            localStorage.removeItem('polwel_refresh_token');
            localStorage.removeItem('polwel_user_data');
            localStorage.removeItem('polwel_last_activity');
            
            // Show error message
            console.error('Session expired, redirecting to login');
            
            // Redirect to login
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
              window.location.replace('/login');
            }
            
            throw new Error('Session expired. Please login again.');
          }
          
          // Other authentication errors
          localStorage.removeItem('polwel_access_token');
          localStorage.removeItem('polwel_refresh_token');
          localStorage.removeItem('polwel_user_data');
          localStorage.removeItem('polwel_last_activity');
          
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.replace('/login');
          }
          
          throw new Error('Authentication failed. Please login again.');
        }
        
        console.error(`API Error (${response.status}):`, errorData);
        throw new Error(`API Error: ${errorData.message || errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log(`API Success for ${endpoint}:`, data);
      return data;
    } catch (error) {
      lastError = error;
      console.error(`API Request attempt ${i + 1} failed:`, {
        endpoint,
        error: error.message,
        token: token ? 'Present' : 'Missing'
      });
      
      // If it's a connection refused error, try next approach
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('CONNECTION_REFUSED') ||
          error.message.includes('ERR_CONNECTION_REFUSED')) {
        
        if (i < attempts.length - 1) {
          console.log(`Connection refused, trying alternative approach...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
      }
      
      // Don't retry on authentication errors
      if (error.message.includes('Session expired') || 
          error.message.includes('Authentication failed') ||
          error.message.includes('TOKEN_EXPIRED')) {
        throw error;
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
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
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

  // Toggle MFA
  toggleMfa: async (id: string, enabled: boolean) => {
    return apiRequest(`/polwel-users/${id}/toggle-mfa`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
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
};

// Trainers API
export const trainersApi = {
  // Get all trainers with pagination and filtering
  getAll: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    availabilityStatus?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
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
    availabilityStatus?: string;
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
    availabilityStatus?: string;
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
    reason: string;
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
};

// Partners API
export const partnersApi = {
  // Get all partners with pagination and filtering
  getAll: async (params: {
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
    
    return apiRequest(`/partners?${queryParams}`);
  },

  // Get partner by ID
  getById: async (id: string) => {
    return apiRequest(`/partners/${id}`);
  },

  // Create new partner (no email/password needed since partners are just data)
  create: async (partnerData: {
    partnerName: string;
    coursesAssigned?: string[];
    pointOfContact?: string;
    contactNumber?: string;
    contactDesignation?: string;
  }) => {
    return apiRequest('/partners', {
      method: 'POST',
      body: JSON.stringify(partnerData),
    });
  },

  // Update partner
  update: async (id: string, partnerData: {
    partnerName?: string;
    coursesAssigned?: string[];
    pointOfContact?: string;
    contactNumber?: string;
    contactDesignation?: string;
    status?: string;
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

  // Get partner statistics
  getStatistics: async () => {
    return apiRequest('/partners/statistics');
  },
};

// Client Organizations API
export const clientOrganizationsApi = {
  // Get all organizations with pagination and filtering
  getAll: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    industry?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/client-organizations?${queryParams}`);
  },

  // Get organization by ID
  getById: async (id: string) => {
    return apiRequest(`/client-organizations/${id}`);
  },

  // Create new organization
  create: async (orgData: {
    name: string;
    displayName?: string;
    industry?: string;
    status?: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactPerson?: string;
    buNumber?: string;
    divisionAddress?: string;
  }) => {
    return apiRequest('/client-organizations', {
      method: 'POST',
      body: JSON.stringify(orgData),
    });
  },

  // Update organization
  update: async (id: string, orgData: {
    name?: string;
    displayName?: string;
    industry?: string;
    status?: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactPerson?: string;
    buNumber?: string;
    divisionAddress?: string;
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
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/client-organizations/${organizationId}/coordinators?${queryParams}`);
  },

  // Create coordinator for an organization
  createCoordinator: async (organizationId: string, coordinatorData: {
    name: string;
    email: string;
    department?: string;
    password: string;
  }) => {
    return apiRequest(`/client-organizations/${organizationId}/coordinators`, {
      method: 'POST',
      body: JSON.stringify(coordinatorData),
    });
  },

  // Update coordinator
  updateCoordinator: async (organizationId: string, coordinatorId: string, coordinatorData: {
    name?: string;
    email?: string;
    department?: string;
    status?: string;
  }) => {
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
};

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
  create: async (courseData: {
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
    status?: string;
    courseFee?: number;
    venueFee?: number;
    trainerFee?: number;
    amountPerPax?: number;
    discount?: number;
    adminFees?: number;
    contingencyFees?: number;
    serviceFees?: number;
    vitalFees?: number;
    venue?: string;
    trainers?: string[];
    certificates?: string;
    remarks?: string;
    courseOutline?: any;
    targetAudience?: string;
    syllabus?: string;
    assessmentMethod?: string;
    certificationType?: string;
  }) => {
    return apiRequest('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  },

  // Update course
  update: async (id: string | number, courseData: any) => {
    return apiRequest(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  },

  // Update course status
  updateStatus: async (id: string | number, status: string) => {
    return apiRequest(`/courses/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Delete course
  delete: async (id: string | number) => {
    return apiRequest(`/courses/${id}`, {
      method: 'DELETE',
    });
  },

  // Get course statistics
  getStatistics: async () => {
    return apiRequest('/courses/statistics');
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
  feeType: "per_head" | "per_venue";
  fee: number;
  contacts: Contact[];
  remarks: string;
  status?: string;
  address?: string;
  description?: string;
  facilities?: string[];
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
  feeType: "PER_HEAD" | "PER_VENUE";
  fee: number;
  status?: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  remarks?: string;
}

// Venues API
export const venuesApi = {
  // Get all venues
  getAll: async () => {
    return apiRequest('/venues');
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
    reason: string;
    type?: string;
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
    reason?: string;
    type?: string;
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

export default {
  polwelUsersApi,
  trainersApi,
  partnersApi,
  clientOrganizationsApi,
  coursesApi,
  venuesApi,
  referencesApi,
};
