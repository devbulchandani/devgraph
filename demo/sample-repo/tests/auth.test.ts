import { describe, it, expect } from "vitest";
import { authService } from "../src/services/auth.service.js";
import { authClient } from "../src/client/authClient.js";
import { handleLoginSubmit } from "../src/components/LoginPage.js";

describe("Sample Repo - Auth Service & Consumer", () => {
  it("authenticates valid user and returns UserAuthResponse contract", async () => {
    const res = await authService.authenticate({
      email: "alice@company.com",
      password: "secure_password_123",
    });

    expect(res.userId).toBeDefined();
    expect(res.email).toBe("alice@company.com");
    expect(res.token).toMatch(/^jwt_/);
    expect(res.roles).toContain("developer");
  });

  it("frontend login consumer expects token in auth response", async () => {
    const res = await handleLoginSubmit("bob@company.com", "pass123");
    expect(res.token).toBeDefined();
  });
});
