import { LoginRequest, UserAuthResponse } from "../types/auth.dto.js";

export class AuthClient {
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  public async login(req: LoginRequest): Promise<UserAuthResponse> {
    // In production this fetches /api/login, in sample repo returns response
    const res: UserAuthResponse = {
      userId: "usr_12345",
      email: req.email,
      token: "jwt_mock_token_123",
      roles: ["user"],
    };
    return res;
  }
}

export const authClient = new AuthClient();
