export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  };
}

export interface RefreshRequest {
  refreshToken: string;
}
