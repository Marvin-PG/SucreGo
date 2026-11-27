import { useCallback, useState } from "react";

export interface UserCoordinates {
  latitude: number;
  longitude: number;
}

export interface GeolocationError {
  code: number | "UNSUPPORTED";
  message: string;
}

export type GeolocationState =
  | { status: "idle"; position: null; error: null }
  | { status: "loading"; position: null; error: null }
  | { status: "success"; position: UserCoordinates; error: null }
  | { status: "error"; position: null; error: GeolocationError };

const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const POSITION_TIMEOUT = 3;

const initialState: GeolocationState = {
  status: "idle",
  position: null,
  error: null,
};

function getErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case PERMISSION_DENIED:
      return "No se concedió permiso para acceder a la ubicación.";
    case POSITION_UNAVAILABLE:
      return "No se pudo determinar la ubicación.";
    case POSITION_TIMEOUT:
      return "La solicitud de ubicación agotó el tiempo de espera.";
    default:
      return "Ocurrió un error al obtener la ubicación.";
  }
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>(initialState);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState({
        status: "error",
        position: null,
        error: {
          code: "UNSUPPORTED",
          message: "Este navegador no permite acceder a la ubicación.",
        },
      });
      return;
    }

    setState({ status: "loading", position: null, error: null });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setState({
          status: "success",
          position: { latitude: coords.latitude, longitude: coords.longitude },
          error: null,
        });
      },
      (error) => {
        setState({
          status: "error",
          position: null,
          error: { code: error.code, message: getErrorMessage(error) },
        });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  return { ...state, requestLocation };
}
