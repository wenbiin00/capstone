// api.config.js

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Base URL - configurable for different environments
// Priority: Environment variable > Fallback to local development
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.68.60:3000/api';

console.log('API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
