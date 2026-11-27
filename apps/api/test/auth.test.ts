import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { SupabaseAuthClient } from "../src/config/supabase.js";
import { createAuthMiddleware } from "../src/middleware/auth.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import { requestIdMiddleware } from "../src/middleware/request-id.js";

const VALID_USER_ID = "2fa53087-367f-4dcf-92e1-01c6979ca813";

function buildTestApp(authClient: SupabaseAuthClient) {
  const app = express();
  const { requireAuth, optionalAuth } = createAuthMiddleware(() => authClient);

  app.use(requestIdMiddleware);

  app.get("/protected", requireAuth, (req, res) => {
    res.status(200).json({ userId: req.user?.id });
  });

  app.get("/public", optionalAuth, (req, res) => {
    res.status(200).json({ userId: req.user?.id ?? null });
  });

  app.use(errorHandler);
  return app;
}

describe("auth middleware", () => {
  it("allows valid Bearer token in requireAuth and populates req.user.id", async () => {
    const getUser = vi.fn<SupabaseAuthClient["getUser"]>(async (token) => {
      if (token === "valid-token") {
        return { data: { user: { id: VALID_USER_ID } }, error: null };
      }

      return { data: { user: null }, error: { message: "Invalid token", status: 401 } };
    });
    const app = buildTestApp({ getUser });

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: VALID_USER_ID });
    expect(getUser).toHaveBeenCalledWith("valid-token");
  });

  it("rejects missing token with standard 401 UNAUTHORIZED error", async () => {
    const getUser = vi.fn<SupabaseAuthClient["getUser"]>();
    const app = buildTestApp({ getUser });

    const response = await request(app).get("/protected");

    expect(response.status).toBe(401);
    expect(response.body.error).toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(typeof response.body.error.message).toBe("string");
    expect(typeof response.body.error.requestId).toBe("string");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("rejects invalid token with standard 401 UNAUTHORIZED error", async () => {
    const getUser = vi.fn<SupabaseAuthClient["getUser"]>(async () => ({
      data: { user: null },
      error: { message: "JWT expired", status: 401 },
    }));
    const app = buildTestApp({ getUser });

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 503 SERVICE_UNAVAILABLE when auth provider has a network failure", async () => {
    const getUser = vi.fn<SupabaseAuthClient["getUser"]>(async () => ({
      data: { user: null },
      error: { message: "Network unreachable", isNetworkError: true },
    }));
    const app = buildTestApp({ getUser });

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("supports optionalAuth with valid token, invalid token, and no token", async () => {
    const getUser = vi.fn<SupabaseAuthClient["getUser"]>(async (token) => {
      if (token === "valid-token") {
        return { data: { user: { id: VALID_USER_ID } }, error: null };
      }

      return { data: { user: null }, error: { message: "Invalid token", status: 401 } };
    });
    const app = buildTestApp({ getUser });

    const withoutToken = await request(app).get("/public");
    expect(withoutToken.status).toBe(200);
    expect(withoutToken.body).toEqual({ userId: null });

    const withValidToken = await request(app)
      .get("/public")
      .set("Authorization", "Bearer valid-token");
    expect(withValidToken.status).toBe(200);
    expect(withValidToken.body).toEqual({ userId: VALID_USER_ID });

    const withInvalidToken = await request(app)
      .get("/public")
      .set("Authorization", "Bearer bad-token");
    expect(withInvalidToken.status).toBe(200);
    expect(withInvalidToken.body).toEqual({ userId: null });
  });
});
