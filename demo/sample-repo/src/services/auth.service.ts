import { LoginRequest, UserAuthResponse } from "../types/auth.dto.js";

export class AuthService {
  public async authenticate(req: LoginRequest): Promise<UserAuthResponse> {
    if (!req.email || !req.password) {
      throw new Error("Invalid credentials");
    }

    // Deterministic mock auth implementation
    return {
      userId: `usr_${Buffer.from(req.email).toString("hex").substring(0, 8)}`,
      email: req.email,
      token: `jwt_${Date.now()}_secure_access_token`,
      roles: ["developer", "member"],
    };
  }

  public validateToken(token: string): boolean {
    return token.startsWith("jwt_");
  }
}

export const authService = new AuthService();
