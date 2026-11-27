import { z } from "zod";

const portSchema = z.coerce.number().int().min(1).max(65535);

const supabaseEnvSchema = z.object({
  SUPABASE_URL: z
    .string()
    .trim()
    .url("SUPABASE_URL must be a valid URL")
    .transform((url) => url.replace(/\/+$/, "")),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
});

export interface SupabaseEnv {
  supabaseUrl: string;
  serviceRoleKey: string;
}

export function parseApiPort(env: NodeJS.ProcessEnv = process.env): number {
  const rawPort = env.API_PORT?.trim() || env.PORT?.trim();
  const parsed = portSchema.safeParse(rawPort && rawPort.length > 0 ? rawPort : 3001);

  if (!parsed.success) {
    throw new Error("API_PORT must be an integer between 1 and 65535");
  }

  return parsed.data;
}

export function parseSupabaseEnv(env: NodeJS.ProcessEnv = process.env): SupabaseEnv {
  const parsed = supabaseEnvSchema.safeParse({
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid Supabase server configuration: ${issues}`);
  }

  return {
    supabaseUrl: parsed.data.SUPABASE_URL,
    serviceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
  };
}
