import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiRequest = async (method, endpoint, payload = null, options = {}) => {
  try {
    const config = {
      method,
      url: endpoint,
      ...options,
    };

    if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = payload;
    }

    if (payload && method === 'GET') {
      config.params = payload;
    }

    const response = await api.request(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      details: error.response?.data?.details,
      error: error.response?.data?.error || error.message,
      status: error.response?.status,
    };
  }
};

export const get = (endpoint, params = null) => apiRequest('GET', endpoint, params);
export const post = (endpoint, payload) => apiRequest('POST', endpoint, payload);
export const put = (endpoint, payload) => apiRequest('PUT', endpoint, payload);
export const del = (endpoint) => apiRequest('DELETE', endpoint);