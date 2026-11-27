interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in: number;
}

const url = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, "");
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const storageKey = `sucrego-session:${url}`;
let pending: Promise<string> | undefined;

async function authenticate(): Promise<string> {
  if (!url || !key) throw new Error("La sesión anónima no está configurada.");
  const stored = localStorage.getItem(storageKey);
  let session: Session | null = null;
  if (stored) {
    try {
      const candidate: Session | null = JSON.parse(stored);
      if (candidate?.access_token && candidate.refresh_token) session = candidate;
    } catch {
      localStorage.removeItem(storageKey);
    }
  }
  if (session?.expires_at && session.expires_at > Date.now() / 1000 + 60) {
    return session.access_token;
  }

  const endpoint = session ? "token?grant_type=refresh_token" : "signup";
  const response = await fetch(`${url}/auth/v1/${endpoint}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify(session ? { refresh_token: session.refresh_token } : {}),
  });
  if (!response.ok) {
    if (session && [400, 401, 403].includes(response.status)) {
      localStorage.removeItem(storageKey);
    }
    throw new Error("No se pudo iniciar la sesión anónima. Intenta de nuevo.");
  }
  const next: Session = await response.json();
  if (!next.access_token || !next.refresh_token) {
    throw new Error("Supabase no devolvió una sesión anónima válida.");
  }
  next.expires_at ??= Math.floor(Date.now() / 1000) + next.expires_in;
  localStorage.setItem(storageKey, JSON.stringify(next));
  return next.access_token;
}

export function anonymousToken() {
  pending ??= authenticate().finally(() => {
    pending = undefined;
  });
  return pending;
}
