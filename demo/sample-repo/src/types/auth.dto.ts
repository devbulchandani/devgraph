export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserAuthResponse {
  userId: string;
  email: string;
  token: string;
  roles: string[];
}

export interface SessionInfo {
  sessionId: string;
  expiresAt: number;
}
