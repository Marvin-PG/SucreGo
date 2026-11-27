interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in: number;
}

const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const storageKey = `sucrego-session:${url}`;
let pending: Promise<string> | undefined;

async function authenticate(): Promise<string> {
  if (!url || !key) throw new Error("La sesión anónima no está configurada.");
  const stored = localStorage.getItem(storageKey);
  const session: Session | null = stored ? JSON.parse(stored) : null;
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
