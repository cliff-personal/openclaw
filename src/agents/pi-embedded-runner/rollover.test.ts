import { describe, expect, it, vi } from "vitest";
import type { CompactEmbeddedPiSessionParams } from "./compact.js";
import { ensureSessionHeader } from "../pi-embedded-helpers.js";
import { performSessionRollover } from "./rollover.js";

// Mock dependencies
vi.mock("../pi-embedded-helpers.js", () => ({
  ensureSessionHeader: vi.fn(),
}));

vi.mock("./logger.js", () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("performSessionRollover", () => {
  const mockParams: CompactEmbeddedPiSessionParams & { priorSessionId: string } = {
    sessionId: "old-session-id",
    priorSessionId: "old-session-id",
    sessionFile: "/tmp/workspace/sessions/old-session-id.jsonl",
    workspaceDir: "/tmp/workspace/data",
    config: {},
  } as any;

  it("successfully rolls over to a new session", async () => {
    vi.mocked(ensureSessionHeader).mockResolvedValue(undefined as any);

    const result = await performSessionRollover(mockParams);

    expect(result.ok).toBe(true);
    expect(result.newSessionId).toBeDefined();
    expect(result.newSessionId).not.toBe(mockParams.priorSessionId);
    expect(result.newSessionFile).toBeDefined();
    expect(result.newSessionFile).toMatch(
      new RegExp(`/tmp/workspace/sessions/${result.newSessionId}.jsonl$`),
    );

    expect(ensureSessionHeader).toHaveBeenCalledWith({
      sessionFile: result.newSessionFile,
      sessionId: result.newSessionId,
      cwd: mockParams.workspaceDir,
    });
  });

  it("handles errors during rollover", async () => {
    const error = new Error("Failed to create session header");
    vi.mocked(ensureSessionHeader).mockRejectedValue(error);

    const result = await performSessionRollover(mockParams);

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Failed to create session header");
    expect(result.newSessionId).toBeUndefined();
  });
});
