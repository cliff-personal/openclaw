import { describe, expect, it } from "vitest";
import { isLikelyImeConfirmEnter } from "./ime.ts";

describe("isLikelyImeConfirmEnter", () => {
  it("returns true when event is composing", () => {
    const ta = document.createElement("textarea");
    const e = new KeyboardEvent("keydown", { key: "Enter", isComposing: true });
    expect(isLikelyImeConfirmEnter(e, ta)).toBe(true);
  });

  it("returns true for Process/Unidentified keys", () => {
    const ta = document.createElement("textarea");
    const e1 = new KeyboardEvent("keydown", { key: "Process" });
    const e2 = new KeyboardEvent("keydown", { key: "Unidentified" });
    expect(isLikelyImeConfirmEnter(e1, ta)).toBe(true);
    expect(isLikelyImeConfirmEnter(e2, ta)).toBe(true);
  });

  it("returns true when textarea is marked composing", () => {
    const ta = document.createElement("textarea");
    ta.dataset.composing = "1";
    const e = new KeyboardEvent("keydown", { key: "Enter" });
    expect(isLikelyImeConfirmEnter(e, ta)).toBe(true);
  });

  it("returns true shortly after composition end", () => {
    const ta = document.createElement("textarea");
    ta.dataset.lastCompositionEndAt = String(Date.now() - 100);
    const e = new KeyboardEvent("keydown", { key: "Enter" });
    expect(isLikelyImeConfirmEnter(e, ta)).toBe(true);
  });

  it("returns false when not composing and outside guard window", () => {
    const ta = document.createElement("textarea");
    ta.dataset.lastCompositionEndAt = String(Date.now() - 400);
    const e = new KeyboardEvent("keydown", { key: "Enter" });
    expect(isLikelyImeConfirmEnter(e, ta)).toBe(false);
  });
});
