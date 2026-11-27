import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import type { Place } from "../api/contract";
import type { UserCoordinates } from "../hooks/useGeolocation";

interface PlaceMapProps {
  places: Place[];
  onPlaceSelect: (place: Place) => void;
  userLocation?: UserCoordinates;
}

type MappablePlace = Place & {
  coordinates: { latitude: number; longitude: number };
};

const SUCRE_CENTER: [number, number] = [-19.0507, -65.2575];

function hasCoordinates(place: Place): place is MappablePlace {
  const { latitude, longitude } = place.coordinates;

  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function MapViewport({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
  }, [center, map]);

  return null;
}

export function PlaceMap({ places, onPlaceSelect, userLocation }: PlaceMapProps) {
  const [tileAttempt, setTileAttempt] = useState(0);
  const [tileError, setTileError] = useState(false);
  const mappablePlaces = places.filter(hasCoordinates);
  const center: [number, number] = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : SUCRE_CENTER;

  return (
    <section aria-label="Mapa de lugares patrimoniales" className="w-full">
      <MapContainer center={center} className="map-canvas w-full" scrollWheelZoom={false} zoom={15}>
        <MapViewport center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          eventHandlers={{
            tileerror: () => setTileError(true),
            tileload: () => setTileError(false),
          }}
          key={tileAttempt}
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mappablePlaces.map((place) => (
          <CircleMarker
            center={[place.coordinates.latitude, place.coordinates.longitude]}
            eventHandlers={{ click: () => onPlaceSelect(place) }}
            key={place.slug}
            pathOptions={{ color: "#172B4D", fillColor: "#C44E36", fillOpacity: 1 }}
            radius={10}
          >
            <Popup>{place.name}</Popup>
          </CircleMarker>
        ))}
        {userLocation && (
          <CircleMarker
            center={[userLocation.latitude, userLocation.longitude]}
            pathOptions={{ color: "#172B4D", fillColor: "#247A65", fillOpacity: 1 }}
            radius={7}
          >
            <Popup>Tu ubicación</Popup>
          </CircleMarker>
        )}
      </MapContainer>
      {tileError && (
        <p className="map-error" role="status">
          No se pudieron cargar las calles del mapa. Puedes elegir un lugar abajo.{" "}
          <button
            type="button"
            onClick={() => {
              setTileError(false);
              setTileAttempt((attempt) => attempt + 1);
            }}
          >
            Reintentar mapa
          </button>
        </p>
      )}
      <ul aria-label="Lugares disponibles" className="place-choices">
        {places.map((place) => (
          <li key={place.slug}>
            <button className="place-choice" onClick={() => onPlaceSelect(place)} type="button">
              {place.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
