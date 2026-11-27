import { useNavigate, NavLink, Route, Routes } from "react-router";
import { PlaceMap } from "./components/PlaceMap";
import { useGeolocation } from "./hooks/useGeolocation";
import { placeFixtures } from "./mocks/places";

function Page({ title }: { title: string }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[390px] px-6 pb-24 pt-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-blue">{title}</h1>
    </main>
  );
}

function ExplorePage() {
  const navigate = useNavigate();
  const geolocation = useGeolocation();
  const userLocation = geolocation.status === "success" ? geolocation.position : undefined;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[390px] px-4 pb-24 pt-6">
      <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-blue">Explorar</h1>
      <PlaceMap
        onPlaceSelect={(place) => navigate(`/place/${place.slug}`)}
        places={placeFixtures}
        userLocation={userLocation}
      />
      <button
        className="mt-4 min-h-11 rounded-lg bg-jade px-4 py-2 font-semibold text-white"
        disabled={geolocation.status === "loading"}
        onClick={geolocation.requestLocation}
        type="button"
      >
        {geolocation.status === "loading" ? "Buscando ubicación…" : "Usar mi ubicación"}
      </button>
      {geolocation.status === "error" && (
        <p aria-live="polite" className="mt-2 text-sm text-terracotta" role="alert">
          {geolocation.error.message}
        </p>
      )}
      {geolocation.status === "success" && (
        <p aria-live="polite" className="mt-2 text-sm text-jade">
          Ubicación disponible en el mapa.
        </p>
      )}
    </main>
  );
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Page title="Bienvenido a SucreGo" />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/place/:slug" element={<Page title="Detalle del lugar" />} />
        <Route path="/passport" element={<Page title="Pasaporte" />} />
        <Route path="/leaderboard" element={<Page title="Ranking" />} />
      </Routes>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-[390px] justify-around border-t border-blue/10 bg-cream px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
      >
        <NavLink
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? "text-terracotta" : "text-blue"}`
          }
          to="/explore"
        >
          Explorar
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? "text-terracotta" : "text-blue"}`
          }
          to="/leaderboard"
        >
          Ranking
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? "text-terracotta" : "text-blue"}`
          }
          to="/passport"
        >
          Pasaporte
        </NavLink>
      </nav>
    </>
  );
}

export default App;
