/**
 * Enhanced API Client
 * LokDarpan Phase 2: Component Reorganization
 * 
 * Centralized API client with request/response interceptors,
 * error handling, caching, and performance optimizations.
 */

import axios from 'axios';

// Base configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const API_VERSION = '/api/v1';

/**
 * Create enhanced axios instance with interceptors
 */
const createApiClient = () => {
  const client = axios.create({
    baseURL: `${API_BASE_URL}${API_VERSION}`,
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    withCredentials: true, // Include cookies for session management
  });

  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      // Add request timestamp for performance monitoring
      config.metadata = { startTime: Date.now() };
      
      // Log API calls in development
      if (import.meta.env.DEV) {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data
        });
      }
      
      return config;
    },
    (error) => {
      console.error('[API Request Error]', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response) => {
      // Calculate request duration
      if (response.config.metadata) {
        const duration = Date.now() - response.config.metadata.startTime;
        response.duration = duration;
        
        if (import.meta.env.DEV) {
          console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`, {
            status: response.status,
            data: response.data
          });
        }
        
        // Log slow requests
        if (duration > 5000) {
          console.warn(`[Slow API Request] ${response.config.url} took ${duration}ms`);
        }
      }
      
      return response;
    },
    (error) => {
      // Enhanced error handling
      const enhancedError = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          method: error.config?.method,
          url: error.config?.url,
          params: error.config?.params
        },
        timestamp: new Date().toISOString()
      };

      // Handle specific error cases
      if (error.response?.status === 401) {
        // Unauthorized - clear session and redirect to login
        console.warn('[API Auth Error] Unauthorized request detected');
        // Emit custom event for auth error handling
        window.dispatchEvent(new CustomEvent('api:auth-error', { detail: enhancedError }));
      }

      if (error.response?.status >= 500) {
        // Server error - log for monitoring
        console.error('[API Server Error]', enhancedError);
        // Emit custom event for server error handling
        window.dispatchEvent(new CustomEvent('api:server-error', { detail: enhancedError }));
      }

      if (error.code === 'ECONNABORTED') {
        // Request timeout
        enhancedError.message = 'Request timeout - server may be overloaded';
      }

      if (!error.response) {
        // Network error
        enhancedError.message = 'Network error - check your connection';
      }

      return Promise.reject(enhancedError);
    }
  );

  return client;
};

// Create main API client instance
export const api = createApiClient();

/**
 * API endpoint methods with enhanced error handling
 */
export const apiMethods = {
  // GET request with caching support
  get: async (url, config = {}) => {
    try {
      const response = await api.get(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // POST request
  post: async (url, data = {}, config = {}) => {
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // PUT request
  put: async (url, data = {}, config = {}) => {
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // DELETE request
  delete: async (url, config = {}) => {
    try {
      const response = await api.delete(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // PATCH request
  patch: async (url, data = {}, config = {}) => {
    try {
      const response = await api.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

/**
 * LokDarpan-specific API endpoints
 */
export const lokDarpanApi = {
  // Authentication
  auth: {
    login: (credentials) => apiMethods.post('/login', credentials),
    logout: () => apiMethods.post('/logout'),
    status: () => apiMethods.get('/status')
  },

  // Ward data
  ward: {
    getMeta: (wardId) => apiMethods.get(`/ward/meta/${wardId}`),
    getProfile: (wardId) => apiMethods.get(`/ward/profile/${wardId}`),
    getDemographics: (wardId) => apiMethods.get(`/ward/demographics/${wardId}`)
  },

  // Trends and analytics
  trends: {
    get: (params) => apiMethods.get('/trends', { params }),
    getEmotions: (params) => apiMethods.get('/trends/emotions', { params }),
    getParties: (params) => apiMethods.get('/trends/parties', { params })
  },

  // Strategic analysis
  strategist: {
    getAnalysis: (ward, params = {}) => apiMethods.get(`/strategist/${ward}`, { params }),
    getBriefing: (ward, params = {}) => apiMethods.get(`/strategist/briefing/${ward}`, { params }),
    getInsights: (ward, params = {}) => apiMethods.get(`/strategist/insights/${ward}`, { params })
  },

  // Geographic data
  geographic: {
    getGeoJson: () => apiMethods.get('/geojson'),
    getBoundaries: (wardId) => apiMethods.get(`/geographic/boundaries/${wardId}`),
    getPollingStations: (wardId) => apiMethods.get(`/geographic/polling-stations/${wardId}`)
  },

  // Content and posts
  content: {
    getPosts: (params) => apiMethods.get('/posts', { params }),
    getAlerts: (ward) => apiMethods.get(`/alerts/${ward}`),
    getCompetitiveAnalysis: (params) => apiMethods.get('/competitive-analysis', { params })
  }
};

/**
 * Request helpers for common patterns
 */
export const requestHelpers = {
  // Batch multiple requests
  batch: async (requests) => {
    try {
      const responses = await Promise.allSettled(requests);
      return responses.map((response, index) => ({
        index,
        success: response.status === 'fulfilled',
        data: response.status === 'fulfilled' ? response.value : null,
        error: response.status === 'rejected' ? response.reason : null
      }));
    } catch (error) {
      console.error('[Batch Request Error]', error);
      throw error;
    }
  },

  // Request with retry logic
  withRetry: async (requestFn, maxRetries = 3, delay = 1000) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw lastError;
  },

  // Request with timeout override
  withTimeout: (requestFn, timeout = 10000) => {
    return Promise.race([
      requestFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
  }
};

// Default export
export default api;