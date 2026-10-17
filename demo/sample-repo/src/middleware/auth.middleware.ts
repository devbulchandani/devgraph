import { UserAuthResponse } from "../types/auth.dto.js";
import { authService } from "../services/auth.service.js";

export function requireAuthHeader(authHeader?: string): { valid: boolean; token?: string } {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false };
  }
  const token = authHeader.substring(7);
  const valid = authService.validateToken(token);
  return { valid, token };
}
