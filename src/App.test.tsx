import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          message: "saved_and_notified",
          requestId: "req-1",
        }),
      }),
    );
  });

  it("submits a yes path with idea", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: "Ja, auf jeden Fall und ich habe eine Idee",
      }),
    );

    await user.type(
      screen.getByLabelText("Deine Idee"),
      "Lass uns Schwarzlicht Minigolf spielen und danach was essen.",
    );

    await user.click(screen.getByRole("button", { name: "Antwort absenden" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("Yes! Samstag unlocked.")).toBeInTheDocument();
  });

  it("requires three confirmation stages before no can be submitted", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Ne, fuck nicht ab" }));
    await user.click(screen.getByRole("button", { name: "Ne, fuck nicht ab" }));
    await user.click(screen.getByRole("button", { name: "Ne, fuck nicht ab" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Weiter (ich bleibe bei Nein)" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Weiter (ich bleibe bei Nein)" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Nein final bestaetigen" }),
    );

    await user.click(screen.getByRole("button", { name: "Antwort absenden" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("Danke dir fuer deine Zeit.")).toBeInTheDocument();
  });
});
