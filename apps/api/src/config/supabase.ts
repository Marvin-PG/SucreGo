import { z } from "zod";
import { parseSupabaseEnv } from "./env.js";
import type { SupabaseEnv } from "./env.js";

export interface SupabaseError {
  message: string;
  code?: string;
  status?: number;
  details?: string;
  isNetworkError?: boolean;
}

export interface SupabaseResult<T> {
  data: T | null;
  error: SupabaseError | null;
}

export interface SupabaseAuthUser {
  id: string;
}

export interface SupabaseAuthClient {
  getUser(token: string): Promise<SupabaseResult<{ user: SupabaseAuthUser | null }>>;
}

export interface InsertOptions {
  onConflict?: string;
  ignoreDuplicates?: boolean;
}

export interface SupabaseRestClient {
  select<T>(
    relation: string,
    query?: Record<string, string | number | undefined>,
  ): Promise<SupabaseResult<T[]>>;
  insert<T>(
    relation: string,
    payload: Record<string, unknown>,
    options?: InsertOptions,
  ): Promise<SupabaseResult<T[]>>;
}

export interface SupabaseClient {
  auth: SupabaseAuthClient;
  rest: SupabaseRestClient;
}

type FetchFn = typeof fetch;

const REQUEST_TIMEOUT_MS = 15_000;

const authUserPayloadSchema = z.object({
  id: z.string().uuid(),
});

const postgrestErrorSchema = z.object({
  message: z.string().optional(),
  code: z.string().optional(),
  details: z.string().nullable().optional(),
  error_description: z.string().optional(),
  msg: z.string().optional(),
});

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | undefined>,
): string {
  const url = new URL(path, `${baseUrl}/`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function parseErrorBody(response: Response): Promise<SupabaseError> {
  let rawText: string;

  try {
    rawText = await response.text();
  } catch {
    return {
      message: `Supabase request failed with status ${response.status}`,
      status: response.status,
    };
  }

  if (!rawText) {
    return {
      message: `Supabase request failed with status ${response.status}`,
      status: response.status,
    };
  }

  try {
    const parsed = postgrestErrorSchema.safeParse(JSON.parse(rawText));

    if (parsed.success) {
      return {
        message:
          parsed.data.message ??
          parsed.data.error_description ??
          parsed.data.msg ??
          `Supabase request failed with status ${response.status}`,
        code: parsed.data.code,
        details: parsed.data.details ?? undefined,
        status: response.status,
      };
    }
  } catch {
    // Non-JSON response body
  }

  return {
    message: `Supabase request failed with status ${response.status}`,
    status: response.status,
  };
}

export function createSupabaseClient(
  config: SupabaseEnv,
  fetchImpl: FetchFn = fetch,
): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("Supabase service client is only available in the server runtime");
  }

  const serviceHeaders = {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    Accept: "application/json",
  };

  return {
    auth: {
      async getUser(token: string) {
        const trimmedToken = token.trim();

        if (!trimmedToken) {
          return {
            data: { user: null },
            error: { message: "Missing bearer token", status: 401 },
          };
        }

        try {
          const response = await fetchImpl(buildUrl(config.supabaseUrl, "/auth/v1/user"), {
            method: "GET",
            headers: {
              apikey: config.serviceRoleKey,
              Authorization: `Bearer ${trimmedToken}`,
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          });

          if (!response.ok) {
            const error = await parseErrorBody(response);
            return { data: { user: null }, error };
          }

          const body: unknown = await response.json();
          const parsed = authUserPayloadSchema.safeParse(body);

          if (!parsed.success) {
            return {
              data: { user: null },
              error: { message: "Invalid user payload returned by Supabase Auth", status: 502 },
            };
          }

          return {
            data: { user: { id: parsed.data.id } },
            error: null,
          };
        } catch (error) {
          return {
            data: { user: null },
            error: {
              message:
                error instanceof Error
                  ? `Supabase Auth request failed: ${error.message}`
                  : "Supabase Auth request failed",
              isNetworkError: true,
            },
          };
        }
      },
    },
    rest: {
      async select<T>(relation: string, query?: Record<string, string | number | undefined>) {
        try {
          const response = await fetchImpl(
            buildUrl(config.supabaseUrl, `/rest/v1/${relation}`, query),
            {
              method: "GET",
              headers: serviceHeaders,
              signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            },
          );

          if (!response.ok) {
            return { data: null, error: await parseErrorBody(response) };
          }

          const body: unknown = await response.json();

          if (!Array.isArray(body)) {
            return {
              data: null,
              error: { message: "Unexpected non-array response from Supabase PostgREST" },
            };
          }

          return { data: body as T[], error: null };
        } catch (error) {
          return {
            data: null,
            error: {
              message:
                error instanceof Error
                  ? `Supabase database request failed: ${error.message}`
                  : "Supabase database request failed",
              isNetworkError: true,
            },
          };
        }
      },
      async insert<T>(relation: string, payload: Record<string, unknown>, options?: InsertOptions) {
        const preferParts = ["return=representation"];

        if (options?.ignoreDuplicates) {
          preferParts.unshift("resolution=ignore-duplicates");
        }

        try {
          const response = await fetchImpl(
            buildUrl(
              config.supabaseUrl,
              `/rest/v1/${relation}`,
              options?.onConflict ? { on_conflict: options.onConflict } : undefined,
            ),
            {
              method: "POST",
              headers: {
                ...serviceHeaders,
                "Content-Type": "application/json",
                Prefer: preferParts.join(","),
              },
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            },
          );

          if (!response.ok) {
            return { data: null, error: await parseErrorBody(response) };
          }

          const rawText = await response.text();

          if (!rawText) {
            return { data: [], error: null };
          }

          const body: unknown = JSON.parse(rawText);
          return { data: (Array.isArray(body) ? body : [body]) as T[], error: null };
        } catch (error) {
          return {
            data: null,
            error: {
              message:
                error instanceof Error
                  ? `Supabase database write failed: ${error.message}`
                  : "Supabase database write failed",
              isNetworkError: true,
            },
          };
        }
      },
    },
  };
}

let cachedClient: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createSupabaseClient(parseSupabaseEnv());
  }

  return cachedClient;
}

export function resetSupabaseClientForTests(): void {
  cachedClient = undefined;
}
