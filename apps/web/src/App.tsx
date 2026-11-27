import { NavLink, Route, Routes, useLocation, useParams } from "react-router";
import { isDemo } from "./api";
import { Explore, Welcome } from "./pages/Explore";
import { PlacePage } from "./pages/Place";
import { Action } from "./components/ui";

function PlaceRoute({ guide }: { guide?: boolean }) {
  const { slug = "" } = useParams();
  return <PlacePage key={`${slug}:${Boolean(guide)}`} slug={slug} guide={guide} />;
}

function App() {
  const { pathname } = useLocation();
  const showNav = ["/explore", "/passport", "/leaderboard"].includes(pathname);

  return (
    <div className={`app-shell ${showNav ? "with-nav" : ""}`}>
      {isDemo && <aside className="demo-banner">Modo demo · Datos de muestra</aside>}
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/place/:slug" element={<PlaceRoute />} />
        <Route path="/place/:slug/guide" element={<PlaceRoute guide />} />
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
            <span aria-hidden="true">♧</span>Explorar
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
