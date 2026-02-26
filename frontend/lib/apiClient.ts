import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// All requests send cookies automatically
export const publicApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends cookies cross-domain
});

// No token in memory needed anymore
// Cookie is sent automatically by browser
export const api = publicApi;