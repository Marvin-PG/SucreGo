import { useNavigate } from "react-router";
import { api } from "../api";
import { art, placeArt } from "../art";
import { PlaceMap } from "../components/PlaceMap";
import { Action, Badge, Card, Status, useResource, XpBar } from "../components/ui";
import { useGeolocation } from "../hooks/useGeolocation";

export function Welcome() {
  return (
    <main className="screen welcome">
      <div
        className="welcome-hero"
        style={{
          backgroundImage: `linear-gradient(180deg, #172b4d25, #a92f21ed), url(${art.city})`,
        }}
      >
        <span className="brand-icon" aria-hidden="true">
          ⌂
        </span>
        <img src={art.wordmark} alt="" />
        <h1 className="sr-only">Bienvenido a SucreGo</h1>
      </div>
      <div className="welcome-content">
        <img className="welcome-mascot" src={art.mascot} alt="" />
        <p>
          Descubre el patrimonio que te rodea.
          <br />
          Aprende, supera retos y deja tu huella.
        </p>
        <Action to="/explore" tone="terra">
          Comenzar la aventura →
        </Action>
        <small>VibeCoders · Sucre 2026</small>
      </div>
    </main>
  );
}

export function Explore() {
  const navigate = useNavigate();
  const geolocation = useGeolocation();
  const places = useResource(api.places);
  const profile = useResource(api.me);
  const items = places.data?.items ?? [];
  const featured = items.find((place) => place.slug === "casa-de-la-libertad") ?? items[0];

  return (
    <main className="screen explore">
      <header className="section-stack">
        <h1>Sal a descubrir</h1>
        {profile.data ? (
          <XpBar level={profile.data.level} totalXp={profile.data.totalXp} />
        ) : (
          <Status {...profile} />
        )}
      </header>
      <div className="map-area">
        {places.data ? (
          <Badge tone="navy">
            {items.length}{" "}
            {items.length === 1 ? "historia por descubrir" : "historias por descubrir"}
          </Badge>
        ) : (
          <Status {...places} />
        )}
        <PlaceMap
          onPlaceSelect={(place) => navigate(`/place/${place.slug}`)}
          places={items}
          userLocation={geolocation.status === "success" ? geolocation.position : undefined}
        />
        <button
          className="location outline"
          disabled={geolocation.status === "loading"}
          onClick={geolocation.requestLocation}
          type="button"
        >
          {geolocation.status === "loading" ? "Buscando ubicación…" : "◎ Usar mi ubicación"}
        </button>
        {geolocation.status === "error" && <p role="alert">{geolocation.error.message}</p>}
        {geolocation.status === "success" && <p role="status">Ubicación disponible en el mapa.</p>}
      </div>
      {featured && (
        <Card tone="mission">
          <div className="mission-heading">
            <img src={featured.imageUrl ?? placeArt[featured.slug] ?? art.city} alt="" />
            <div>
              <Badge tone="terra">Misión cultural</Badge>
              <h2>{featured.name}</h2>
            </div>
          </div>
          <p>{featured.summary}</p>
          <p>Una lección y tres preguntas.</p>
          <Action to={`/place/${featured.slug}`}>Explorar lugar →</Action>
        </Card>
      )}
    </main>
  );
}
