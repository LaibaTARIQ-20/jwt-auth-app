import { publicApi, setAccessToken, clearAccessToken } from "./apiClient";

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
  message: string;
}

export const loginUser = async (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  const res = await publicApi.post<AuthResponse>("/auth/login", {
    email,
    password,
  });
  setAccessToken(res.data.accessToken);
  return res.data;
};

export const registerUser = async (
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> => {
  const res = await publicApi.post<AuthResponse>("/auth/register", {
    name,
    email,
    password,
  });
  setAccessToken(res.data.accessToken); // ← access token stored in memory
  return res.data;
};

export const logoutUser = async (): Promise<void> => {
  try {
    await publicApi.post("/auth/logout");
  } finally {
    clearAccessToken();
  }
};

export const refreshSession = async (): Promise<AuthResponse | null> => {
  try {
    const res = await publicApi.post<AuthResponse>("/auth/refresh");
    setAccessToken(res.data.accessToken);
    return res.data;
  } catch {
    clearAccessToken();
    return null;
  }
};
