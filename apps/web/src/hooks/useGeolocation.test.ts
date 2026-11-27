import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGeolocation } from "./useGeolocation";

const successfulPosition: GeolocationPosition = {
  coords: {
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    latitude: -19.0479,
    longitude: -65.25952,
    speed: null,
    toJSON: () => ({}),
  },
  timestamp: 1,
  toJSON: () => ({}),
};

describe("useGeolocation", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "geolocation");
  });

  it("requests and stores the user's position", () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success(successfulPosition);
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.requestLocation());

    expect(getCurrentPosition).toHaveBeenCalledOnce();
    expect(result.current).toMatchObject({
      status: "success",
      position: { latitude: -19.0479, longitude: -65.25952 },
      error: null,
    });
  });

  it("reports denied location permission", () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => {
      error({ code: 1, message: "Permission denied" } as GeolocationPositionError);
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.requestLocation());

    expect(result.current).toMatchObject({
      status: "error",
      error: {
        code: 1,
        message: "No se concedió permiso para acceder a la ubicación.",
      },
    });
  });

  it("reports unsupported browsers without requesting a position", () => {
    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.requestLocation());

    expect(result.current).toMatchObject({
      status: "error",
      error: { code: "UNSUPPORTED" },
    });
  });
});
