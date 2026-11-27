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

  it("navigates to a selected place from the map", async () => {
    render(
      <MemoryRouter initialEntries={["/explore"]}>
        <App />
        <CurrentPath />
      </MemoryRouter>,
    );

    fireEvent.click(
      await within(screen.getByRole("list", { name: "Lugares disponibles" })).findByRole("button", {
        name: "Plaza 25 de Mayo",
      }),
    );

    expect(await screen.findByRole("heading", { name: "Plaza 25 de Mayo" })).toBeInTheDocument();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/place/plaza-25-de-mayo");
  });
  it("runs the demo through the guide, challenge, passport and ranking", async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("link", { name: /comenzar la aventura/i }));
    fireEvent.click(await screen.findByRole("link", { name: /explorar lugar/i }));
    fireEvent.click(await screen.findByRole("link", { name: /comenzar lección/i }));
    expect(await screen.findByRole("link", { name: /UNESCO/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "¿Qué ocurrió aquí?" }));
    expect(await screen.findByText("Respuesta no verificada")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: /iniciar desafío/i }));

    fireEvent.click(await screen.findByRole("radio", { name: /Casa de la Libertad/ }));
    fireEvent.click(screen.getByRole("button", { name: /siguiente pregunta/i }));
    fireEvent.click(screen.getByRole("radio", { name: /^B Sucre$/ }));
    fireEvent.click(screen.getByRole("button", { name: /siguiente pregunta/i }));
    fireEvent.click(screen.getByRole("radio", { name: /En la fuente enlazada/ }));
    fireEvent.click(screen.getByRole("button", { name: /ver resultado/i }));

    expect(await screen.findByRole("heading", { name: "¡Misión completada!" })).toBeInTheDocument();
    expect(screen.getByText("Esta partida de demostración no concede XP.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Ver mi pasaporte" }));
    expect(await screen.findByText("1 misión completada")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Ranking" }));
    expect(await screen.findByText("Ranking de muestra")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Ruta Andina" })).toBeInTheDocument();
  });
});
