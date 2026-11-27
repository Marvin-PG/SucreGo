import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import type { PlaceFixture } from "../mocks/places";
import type { UserCoordinates } from "../hooks/useGeolocation";

interface PlaceMapProps {
  places: PlaceFixture[];
  onPlaceSelect: (place: PlaceFixture) => void;
  userLocation?: UserCoordinates;
}

type MappablePlace = PlaceFixture & {
  coordinates: { latitude: number; longitude: number };
};

const SUCRE_CENTER: [number, number] = [-19.0479, -65.25952];

function hasCoordinates(place: PlaceFixture): place is MappablePlace {
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
  const mappablePlaces = places.filter(hasCoordinates);
  const center: [number, number] = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : SUCRE_CENTER;

  return (
    <section aria-label="Mapa de lugares patrimoniales" className="w-full">
      <MapContainer
        center={center}
        className="h-[min(60vh,480px)] min-h-72 w-full"
        scrollWheelZoom={false}
        zoom={userLocation ? 15 : 14}
      >
        <MapViewport center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
      <ul aria-label="Lugares disponibles" className="mt-3 flex flex-wrap gap-2">
        {mappablePlaces.map((place) => (
          <li key={place.slug}>
            <button
              className="min-h-11 rounded-lg border border-blue/20 px-3 py-2 text-sm font-semibold text-blue"
              onClick={() => onPlaceSelect(place)}
              type="button"
            >
              {place.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
