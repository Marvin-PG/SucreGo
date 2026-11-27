import type { Api } from "./contract";
import { anonymousToken } from "./session";

const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, "");
export const isDemo = !baseUrl;

async function request<T>(
  path: string,
  authenticated = false,
  method = "GET",
  body?: object,
): Promise<T> {
  const headers = new Headers();
  if (authenticated) headers.set("Authorization", `Bearer ${await anonymousToken()}`);
  if (body) headers.set("Content-Type", "application/json");

  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      payload?.error?.message ?? `No se pudo completar la solicitud (${response.status}).`,
    );
  }

  return response.json();
}

const placePath = (slug: string) => `/places/${encodeURIComponent(slug)}`;

export const realApi: Api = {
  places: () => request("/places"),
  place: (slug) => request(placePath(slug)),
  lesson: (slug) => request(`${placePath(slug)}/lesson`, true, "POST"),
  chat: (slug, message) => request(`${placePath(slug)}/chat`, true, "POST", { message }),
  quiz: (slug) => request(`${placePath(slug)}/quiz`, true),
  submit: (slug, submission) => request(`${placePath(slug)}/quiz/submit`, true, "POST", submission),
  me: () => request("/me", true),
  leaderboard: () => request("/leaderboard"),
};
