import { publicApi } from './apiClient';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  message: string;
}

// No accessToken in response anymore — it's in the cookie
export const loginUser = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const res = await publicApi.post<AuthResponse>('/auth/login', {
    email,
    password,
  });
  return res.data;
};

export const registerUser = async (
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  const res = await publicApi.post<AuthResponse>('/auth/register', {
    name,
    email,
    password,
  });
  return res.data;
};

export const logoutUser = async (): Promise<void> => {
  await publicApi.post('/auth/logout');
};

export const refreshSession = async (): Promise<AuthResponse | null> => {
  try {
    const res = await publicApi.post<AuthResponse>('/auth/refresh');
    return res.data;
  } catch {
    return null;
  }
};