import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = "https://project.supabase.test";
const api = "https://sucrego.test";
const fetchMock = vi.fn<typeof fetch>();

function json(body: object) {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_API_BASE_URL", api);
  vi.stubEnv("VITE_SUPABASE_URL", auth);
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_example");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("API en modo conectado", () => {
  it("consulta lugares sin autenticar y comparte una sesión anónima entre solicitudes", async () => {
    fetchMock.mockImplementation(async (input) => {
      if (input === `${auth}/auth/v1/signup`) {
        return json({ access_token: "jwt", refresh_token: "refresh", expires_in: 3600 });
      }
      return json({});
    });
    const { realApi, isDemo } = await import("./client");
    expect(isDemo).toBe(false);
    await realApi.places();
    await Promise.all([realApi.me(), realApi.lesson("la-recoleta")]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const headersFor = (url: string) =>
      new Headers(fetchMock.mock.calls.find(([input]) => input === url)?.[1]?.headers);
    expect(headersFor(`${api}/api/places`).has("Authorization")).toBe(false);
    expect(headersFor(`${auth}/auth/v1/signup`).get("apikey")).toBe("sb_publishable_example");
    expect(headersFor(`${api}/api/me`).get("Authorization")).toBe("Bearer jwt");
    expect(headersFor(`${api}/api/places/la-recoleta/lesson`).get("Authorization")).toBe(
      "Bearer jwt",
    );
  });

  it("renueva una sesión y conserva la recompensa devuelta por el servidor", async () => {
    localStorage.setItem(
      `sucrego-session:${auth}`,
      JSON.stringify({ access_token: "expired", refresh_token: "refresh", expires_at: 1 }),
    );
    const result = { passed: true, xpAwarded: 0, totalXp: 100, firstCompletion: false };
    fetchMock
      .mockResolvedValueOnce(
        json({ access_token: "renewed", refresh_token: "new", expires_in: 3600 }),
      )
      .mockResolvedValueOnce(json(result));
    const { realApi } = await import("./client");

    const submission = { quizId: "quiz", answers: [{ questionId: "question", optionId: "A" }] };
    await expect(realApi.submit("la-recoleta", submission)).resolves.toEqual(result);
    expect(fetchMock.mock.calls[0][0]).toBe(`${auth}/auth/v1/token?grant_type=refresh_token`);
    expect(fetchMock.mock.calls[1][0]).toBe(`${api}/api/places/la-recoleta/quiz/submit`);
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get("Authorization")).toBe(
      "Bearer renewed",
    );
    expect(fetchMock.mock.calls[1][1]?.body).toBe(JSON.stringify(submission));
  });
});
