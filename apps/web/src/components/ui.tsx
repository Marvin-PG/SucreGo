import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Source } from "../api/contract";

export function Action({
  to,
  children,
  tone = "",
}: {
  to: string;
  children: ReactNode;
  tone?: string;
}) {
  return (
    <Link className={`action ${tone}`} to={to}>
      {children}
    </Link>
  );
}

export function Back({ to }: { to: string }) {
  return (
    <Link className="back" aria-label="Volver" to={to}>
      ‹
    </Link>
  );
}

export function Badge({ children, tone = "" }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Card({ children, tone = "" }: { children: ReactNode; tone?: string }) {
  return <section className={`card ${tone}`}>{children}</section>;
}

export function XpBar({ level, totalXp }: { level: string; totalXp: number }) {
  return (
    <div className="xp">
      <div>
        <span>{level}</span>
        <strong>{totalXp} XP</strong>
      </div>
      <progress
        aria-label="Progreso hacia los primeros 100 XP"
        max={100}
        value={Math.min(totalXp, 100)}
      />
    </div>
  );
}

export function Sources({ items }: { items: Source[] }) {
  const links = items.filter((source) => /^https?:\/\//i.test(source.url));
  if (!links.length) return <small>Sin fuentes enlazadas.</small>;
  return (
    <ul className="sources" aria-label="Fuentes consultadas">
      {links.map((source) => (
        <li key={source.url}>
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.title} ↗
          </a>
        </li>
      ))}
    </ul>
  );
}

export function useResource<T>(load: () => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    load: typeof load;
    attempt: number;
    data?: T;
    error?: string;
  }>();
  useEffect(() => {
    let active = true;
    load().then(
      (data) => {
        if (active) setState({ load, attempt, data });
      },
      (error: unknown) => {
        if (active) setState({ load, attempt, error: errorMessage(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [load, attempt]);

  const current = state?.load === load && state.attempt === attempt ? state : undefined;
  return { ...current, retry: () => setAttempt((value) => value + 1) };
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error. Intenta de nuevo.";
}

export function Status({ error, retry }: { error?: string; retry?: () => void }) {
  if (!error)
    return (
      <p role="status" className="status">
        Cargando…
      </p>
    );
  return (
    <div role="alert" className="status">
      <p>{error}</p>
      {retry && (
        <button className="action outline" onClick={retry} type="button">
          Reintentar
        </button>
      )}
    </div>
  );
}
