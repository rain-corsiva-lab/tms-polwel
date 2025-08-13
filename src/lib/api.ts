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

// API request helper
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

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: 'Network error', 
        message: `HTTP error! status: ${response.status}` 
      }));
      
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

export default {
  polwelUsersApi,
  trainersApi,
  clientOrganizationsApi,
};
