import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PlaceMap } from "./PlaceMap";
import { placeFixtures } from "../mocks/places";

vi.mock("react-leaflet", async () => {
  const { createElement } = await import("react");

  return {
    CircleMarker: ({
      children,
      eventHandlers,
    }: {
      children?: ReactNode;
      eventHandlers?: { click?: () => void };
    }) => createElement("button", { onClick: eventHandlers?.click, type: "button" }, children),
    MapContainer: ({ children }: { children?: ReactNode }) =>
      createElement("div", { "data-testid": "map" }, children),
    Popup: ({ children }: { children?: ReactNode }) => createElement("span", null, children),
    TileLayer: () => null,
    useMap: () => ({ setView: vi.fn() }),
  };
});

describe("PlaceMap", () => {
  it("renders three markers and selects a place", () => {
    const onPlaceSelect = vi.fn();
    render(<PlaceMap onPlaceSelect={onPlaceSelect} places={placeFixtures} />);

    expect(screen.getByTestId("map")).toBeInTheDocument();
    expect(within(screen.getByTestId("map")).getAllByRole("button")).toHaveLength(3);

    fireEvent.click(within(screen.getByTestId("map")).getAllByRole("button")[0]);

    expect(onPlaceSelect).toHaveBeenCalledWith(placeFixtures[0]);
  });

  it("does not render a marker for places without valid coordinates", () => {
    const onPlaceSelect = vi.fn();
    const placesWithoutCoordinates = [
      ...placeFixtures,
      {
        ...placeFixtures[0],
        slug: "sin-coordenadas",
        coordinates: { latitude: null, longitude: null },
      },
    ];
    render(<PlaceMap onPlaceSelect={onPlaceSelect} places={placesWithoutCoordinates} />);

    expect(within(screen.getByTestId("map")).getAllByRole("button")).toHaveLength(3);
  });
});
