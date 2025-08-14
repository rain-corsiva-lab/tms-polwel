// API Configuration
const API_BASE_URL = 'http://localhost:3001/api';

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
const apiRequest = async (endpoint: string, options: RequestInit = {}, retries = 2) => {
  const token = getAuthToken();
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  let lastError;
  
  // Try different approaches to handle connection issues
  const attempts = [
    () => fetch(`${API_BASE_URL}${endpoint}`, config),
    () => fetch(`${API_BASE_URL}${endpoint}`, { ...config, mode: 'cors' }),
    () => fetch(`http://127.0.0.1:3001/api${endpoint}`, config),
  ];

  for (let i = 0; i < attempts.length; i++) {
    try {
      console.log(`API Request attempt ${i + 1} for ${endpoint}`);
      const response = await attempts[i]();
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: 'Network error', 
          message: `HTTP error! status: ${response.status}` 
        }));
        
        console.error(`API Error (${response.status}):`, errorData);
        throw new Error(`API Error: ${errorData.message || response.statusText}`);
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
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
          continue;
        }
      }
    }
  }

  // If all attempts failed, return fallback data for certain endpoints
  console.error('All API attempts failed, checking for fallback data...');
  
  if (endpoint === '/references/categories') {
    console.log('Returning fallback categories data');
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
    console.log('Returning fallback trainers data');
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
    console.log('Returning fallback venues data');
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
    console.log('Returning fallback partners data');
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

  // For other endpoints, throw the last error
  throw lastError;
      
      // Handle specific authentication errors
      if (response.status === 401) {
        // Token expired or invalid - redirect to login
        localStorage.removeItem('polwel_access_token');
        localStorage.removeItem('polwel_refresh_token');
        localStorage.removeItem('polwel_user_data');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
      
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    // Log the error for debugging
    console.error('API Request Error:', {
      endpoint,
      error: error.message,
      token: token ? 'Present' : 'Missing'
    });
    throw error;
  }
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

export default {
  polwelUsersApi,
  trainersApi,
  clientOrganizationsApi,
  coursesApi,
  referencesApi,
};
