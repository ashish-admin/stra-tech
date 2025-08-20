/**
 * API client for Political Strategist services
 */

import axios from 'axios';

const apiBase = import.meta.env.VITE_API_BASE_URL || '';

// Create axios instance with default config
const strategistClient = axios.create({
  baseURL: `${apiBase}/api/v1/strategist`,
  withCredentials: true,
  timeout: 30000, // 30 second timeout for AI operations
  headers: {
    'Content-Type': 'application/json',
  }
});

// Response interceptor for error handling
strategistClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const strategistApi = {
  /**
   * Get comprehensive strategic analysis for a ward
   */
  async getWardAnalysis(ward, depth = 'standard', context = 'neutral') {
    try {
      const response = await strategistClient.get(`/${encodeURIComponent(ward)}`, {
        params: { depth, context }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching ward analysis:', error);
      throw error;
    }
  },

  /**
   * Analyze arbitrary text content
   */
  async analyzeContent(payload) {
    try {
      const response = await strategistClient.post('/analyze', payload);
      return response.data;
    } catch (error) {
      console.error('Error analyzing content:', error);
      throw error;
    }
  },

  /**
   * Trigger manual analysis for a ward
   */
  async triggerAnalysis(ward, depth = 'standard') {
    try {
      const response = await strategistClient.post('/trigger', {
        ward,
        depth,
        priority: 'high'
      });
      return response.data;
    } catch (error) {
      console.error('Error triggering analysis:', error);
      throw error;
    }
  },

  /**
   * Get system status and health
   */
  async getSystemStatus() {
    try {
      const response = await strategistClient.get('/status');
      return response.data;
    } catch (error) {
      console.error('Error getting system status:', error);
      throw error;
    }
  },

  /**
   * Get health check information
   */
  async getHealthCheck() {
    try {
      const response = await strategistClient.get('/health');
      return response.data;
    } catch (error) {
      console.error('Error getting health check:', error);
      throw error;
    }
  },

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const response = await strategistClient.get('/cache/stats');
      return response.data;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      throw error;
    }
  },

  /**
   * Invalidate cache for ward or pattern
   */
  async invalidateCache(pattern) {
    try {
      const response = await strategistClient.post('/cache/invalidate', {
        pattern: pattern || 'strategist:*'
      });
      return response.data;
    } catch (error) {
      console.error('Error invalidating cache:', error);
      throw error;
    }
  }
};

// Legacy API compatibility for gradual migration
export const legacyApi = {
  /**
   * Get pulse briefing (legacy format)
   */
  async getPulseBriefing(ward, days = 14) {
    try {
      const response = await axios.get(
        `${apiBase}/api/v1/pulse/${encodeURIComponent(ward)}`,
        { 
          params: { days },
          withCredentials: true 
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching pulse briefing:', error);
      throw error;
    }
  }
};

export default strategistApi;