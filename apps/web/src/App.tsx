import { useLayoutEffect, useState } from "react";
import type { Result } from "./api/contract";
import { QuizPage, ResultPage } from "./pages/Quiz";
import { Leaderboard, Passport } from "./pages/Progress";
import { NavLink, Route, Routes, useLocation, useParams } from "react-router";
import { isDemo } from "./api";
import { Explore, Welcome } from "./pages/Explore";
import { PlacePage } from "./pages/Place";
import { Action } from "./components/ui";

function PlaceRoute({ guide }: { guide?: boolean }) {
  const { slug = "" } = useParams();
  return <PlacePage key={`${slug}:${Boolean(guide)}`} slug={slug} guide={guide} />;
}

function QuizRoute({ onResult }: { onResult: (slug: string, result: Result) => void }) {
  const { slug = "" } = useParams();
  return <QuizPage key={slug} slug={slug} onResult={(result) => onResult(slug, result)} />;
}

function ResultRoute({ latest }: { latest?: { slug: string; result: Result } }) {
  const { slug = "" } = useParams();
  return <ResultPage slug={slug} result={latest?.slug === slug ? latest.result : undefined} />;
}

function App() {
  const [latest, setLatest] = useState<{ slug: string; result: Result }>();
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0;
  }, [pathname]);
  const showNav = ["/explore", "/passport", "/leaderboard"].includes(pathname);

  return (
    <div className={`app-shell ${showNav ? "with-nav" : ""}`}>
      {isDemo && pathname !== "/" && (
        <aside className="demo-banner">Modo demo · Datos de muestra</aside>
      )}
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/place/:slug" element={<PlaceRoute />} />
        <Route path="/place/:slug/guide" element={<PlaceRoute guide />} />
        <Route
          path="/place/:slug/quiz"
          element={<QuizRoute onResult={(slug, result) => setLatest({ slug, result })} />}
        />
        <Route path="/place/:slug/result" element={<ResultRoute latest={latest} />} />
        <Route path="/passport" element={<Passport />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route
          path="*"
          element={
            <main className="screen padded section-stack">
              <h1>Página no disponible</h1>
              <Action to="/explore">Volver al mapa</Action>
            </main>
          }
        />
      </Routes>
      {showNav && (
        <nav aria-label="Navegación principal" className="bottom-nav">
          <NavLink to="/explore">
            <span aria-hidden="true">◫</span>Explorar
          </NavLink>
          <NavLink to="/leaderboard">
            <span aria-hidden="true">▥</span>Ranking
          </NavLink>
          <NavLink to="/passport">
            <span aria-hidden="true">▤</span>Pasaporte
          </NavLink>
        </nav>
      )}
    </div>
  );
}

export default App;
