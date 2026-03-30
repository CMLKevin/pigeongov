import { describe, expect, test } from "vitest";

import { shouldUseTui } from "../../src/cli/tui.js";

describe("shouldUseTui", () => {
  test("uses the TUI for interactive 1040 fills in a real terminal", () => {
    expect(
      shouldUseTui(
        { formId: "1040", interactive: true, tui: true },
        { stdinIsTty: true, stdoutIsTty: true },
      ),
    ).toBe(true);
  });

  test("does not use the TUI for non-interactive automation", () => {
    expect(
      shouldUseTui(
        { formId: "1040", interactive: false, tui: true },
        { stdinIsTty: true, stdoutIsTty: true },
      ),
    ).toBe(false);
  });

  test("does not use the TUI when explicitly disabled", () => {
    expect(
      shouldUseTui(
        { formId: "1040", interactive: true, tui: false },
        { stdinIsTty: true, stdoutIsTty: true },
      ),
    ).toBe(false);
  });

  test("uses the TUI for other interactive workflows too", () => {
    expect(
      shouldUseTui(
        { formId: "immigration/family-visa-intake", interactive: true, tui: true },
        { stdinIsTty: true, stdoutIsTty: true },
      ),
    ).toBe(true);
  });

  test("does not use the TUI when stdout is not a terminal", () => {
    expect(
      shouldUseTui(
        { formId: "1040", interactive: true, tui: true },
        { stdinIsTty: true, stdoutIsTty: false },
      ),
    ).toBe(false);
  });
});
