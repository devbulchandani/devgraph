import { authClient } from "../client/authClient.js";
import { UserAuthResponse } from "../types/auth.dto.js";

export async function handleLoginSubmit(email: string, password: string): Promise<UserAuthResponse> {
  const response = await authClient.login({ email, password });
  // Relies directly on the response.token contract!
  if (!response.token) {
    throw new Error("Missing authentication token in server response");
  }
  return response;
}
