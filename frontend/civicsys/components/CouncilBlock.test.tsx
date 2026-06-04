import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CouncilBlock, type Council } from "./CouncilBlock";

const data: Council = {
  proposal: { id: 1, title: "Reforma 56" },
  advisors: [
    {
      id: "ejecutor",
      name: "Ejecutor",
      lens: "viabilidad",
      color: "#00ff66",
      temp: 0.2,
      purist: false,
      postura: "A_FAVOR",
      text: "ok",
      provider: "gemini",
      confidence: 8,
      latency_ms: 100,
    },
    {
      id: "principios",
      name: "Primeros Principios",
      lens: "crudo",
      color: "#fff",
      temp: 0.6,
      purist: true,
      postura: "CAUTELA",
      text: "depende",
      provider: "simulado",
      confidence: 6,
      latency_ms: 50,
    },
  ],
  verdict: { text: "Avanzar con cautela", provider: "gemini", confidence: 7 },
  divergence: { level: "media", score: 0.55, posturas: { A_FAVOR: 1, CAUTELA: 1 } },
  consensus: false,
  elapsed_ms: 1234,
};

describe("CouncilBlock", () => {
  it("renderiza consejeros, posturas y veredicto", () => {
    render(<CouncilBlock data={data} />);
    expect(screen.getByText(/Reforma 56/)).toBeInTheDocument();
    expect(screen.getByText(/Avanzar con cautela/)).toBeInTheDocument();
    expect(screen.getByText(/Veredicto consolidado/i)).toBeInTheDocument();
    expect(screen.getByText(/disenso/i)).toBeInTheDocument();
    expect(screen.getByText(/Primeros Principios · purista/)).toBeInTheDocument();
  });
});
