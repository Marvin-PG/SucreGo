import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

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
    MapContainer: ({ children }: { children?: ReactNode }) => createElement("div", null, children),
    Popup: ({ children }: { children?: ReactNode }) => createElement("span", null, children),
    TileLayer: () => null,
    useMap: () => ({ setView: vi.fn() }),
  };
});

function CurrentPath() {
  return <output data-testid="current-path">{useLocation().pathname}</output>;
}

describe("App", () => {
  it("renders the welcome screen", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Bienvenido a SucreGo" })).toBeInTheDocument();
  });

  it("navigates to a selected place from the map", () => {
    render(
      <MemoryRouter initialEntries={["/explore"]}>
        <App />
        <CurrentPath />
      </MemoryRouter>,
    );

    fireEvent.click(
      within(screen.getByRole("list", { name: "Lugares disponibles" })).getByRole("button", {
        name: "Plaza 25 de Mayo",
      }),
    );

    expect(screen.getByRole("heading", { name: "Detalle del lugar" })).toBeInTheDocument();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/place/plaza-25-de-mayo");
  });
});
