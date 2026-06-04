import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { VoteVisibilityWarning } from "./VoteVisibilityWarning";

describe("VoteVisibilityWarning", () => {
  it("tiene role=alert para accesibilidad y atencion visual", () => {
    render(<VoteVisibilityWarning />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("expone data-testid para integracion en pagina de voto", () => {
    render(<VoteVisibilityWarning />);
    expect(screen.getByTestId("vote-visibility-warning")).toBeInTheDocument();
  });

  it("informa la visibilidad publica del voto", () => {
    render(<VoteVisibilityWarning />);
    expect(screen.getByText(/visible públicamente/i)).toBeInTheDocument();
  });

  it("menciona commit-reveal como plan de mitigacion futura", () => {
    render(<VoteVisibilityWarning />);
    expect(screen.getByText(/commit-reveal/i)).toBeInTheDocument();
  });

  it("incluye link a known-limitations.md", () => {
    render(<VoteVisibilityWarning />);
    const links = screen.getAllByRole("link");
    const ref = links.find((a) =>
      a.getAttribute("href")?.includes("known-limitations.md"),
    );
    expect(ref).toBeDefined();
    expect(ref).toHaveAttribute("target", "_blank");
  });
});
