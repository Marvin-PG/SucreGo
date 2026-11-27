import { describe, expect, it, vi } from "vitest";
import { parseApiPort, parseSupabaseEnv } from "../src/config/env.js";
import { createSupabaseClient } from "../src/config/supabase.js";
import { SupabaseQuizRepository } from "../src/modules/quiz/quiz.repository.js";

const TEST_CONFIG = {
  supabaseUrl: "https://example.supabase.co",
  serviceRoleKey: "test-placeholder-key",
};

const VALID_USER_ID = "2fa53087-367f-4dcf-92e1-01c6979ca813";

describe("env validation", () => {
  it("parses API_PORT with default 3001 and rejects invalid ports", () => {
    expect(parseApiPort({})).toBe(3001);
    expect(parseApiPort({ API_PORT: "4000" })).toBe(4000);
    expect(() => parseApiPort({ API_PORT: "99999" })).toThrow(/API_PORT/);
  });

  it("validates Supabase server env with zod", () => {
    expect(
      parseSupabaseEnv({
        SUPABASE_URL: "https://example.supabase.co/",
        SUPABASE_SERVICE_ROLE_KEY: "test-placeholder-key",
      }),
    ).toEqual({
      supabaseUrl: "https://example.supabase.co",
      serviceRoleKey: "test-placeholder-key",
    });

    expect(() =>
      parseSupabaseEnv({
        SUPABASE_URL: "not-a-url",
        SUPABASE_SERVICE_ROLE_KEY: "",
      }),
    ).toThrow(/Invalid Supabase server configuration/);
  });
});

describe("createSupabaseClient", () => {
  it("validates user JWT via Supabase Auth endpoint", async () => {
    const mockFetch = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ id: VALID_USER_ID }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const client = createSupabaseClient(TEST_CONFIG, mockFetch);
    const result = await client.auth.getUser("user-jwt-token");

    expect(result).toEqual({
      data: { user: { id: VALID_USER_ID } },
      error: null,
    });
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] ?? [];
    expect(url).toBe("https://example.supabase.co/auth/v1/user");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer user-jwt-token");
  });

  it("returns error when Supabase Auth rejects token", async () => {
    const mockFetch = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ msg: "Invalid JWT" }), { status: 401 });
    });

    const client = createSupabaseClient(TEST_CONFIG, mockFetch);
    const result = await client.auth.getUser("expired-token");

    expect(result.data?.user).toBeNull();
    expect(result.error?.status).toBe(401);
  });

  it("handles idempotent mission completion conflict without throwing 500", async () => {
    const mockFetch = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ code: "23505", message: "duplicate key value" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    });

    const client = createSupabaseClient(TEST_CONFIG, mockFetch);
    const quizRepo = new SupabaseQuizRepository(() => client);
    const result = await quizRepo.recordFirstMissionCompletion({
      userId: VALID_USER_ID,
      placeSlug: "plaza-25-de-mayo",
      xpAwarded: 100,
    });

    expect(result).toEqual({ inserted: false });
  });

  it("treats empty array from ignore-duplicates insert as already completed", async () => {
    const mockFetch = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify([]), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });

    const client = createSupabaseClient(TEST_CONFIG, mockFetch);
    const quizRepo = new SupabaseQuizRepository(() => client);
    const result = await quizRepo.recordFirstMissionCompletion({
      userId: VALID_USER_ID,
      placeSlug: "plaza-25-de-mayo",
      xpAwarded: 100,
    });

    expect(result).toEqual({ inserted: false });
  });
});
