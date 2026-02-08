import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GatewayRequestContext } from "./types.js";
import { chatHandlers } from "./chat.js";

const mocks = vi.hoisted(() => ({
  dispatchInboundMessage: vi.fn(),
  updateSessionStore: vi.fn(),
  loadSessionEntry: vi.fn(),
  readSessionMessages: vi.fn(),
}));

vi.mock("../../auto-reply/dispatch.js", () => ({
  dispatchInboundMessage: mocks.dispatchInboundMessage,
}));

vi.mock("../../auto-reply/reply/reply-dispatcher.js", () => ({
  createReplyDispatcher: () => ({}),
}));

vi.mock("../../channels/reply-prefix.js", () => ({
  createReplyPrefixOptions: () => ({
    onModelSelected: () => {},
  }),
}));

vi.mock("../../sessions/send-policy.js", () => ({
  resolveSendPolicy: () => "allow",
}));

vi.mock("../../agents/timeout.js", () => ({
  resolveAgentTimeoutMs: () => 30_000,
}));

vi.mock("../../config/sessions.js", async () => {
  const actual = await vi.importActual<typeof import("../../config/sessions.js")>(
    "../../config/sessions.js",
  );
  return {
    ...actual,
    updateSessionStore: mocks.updateSessionStore,
  };
});

vi.mock("../session-utils.js", async () => {
  const actual = await vi.importActual<typeof import("../session-utils.js")>("../session-utils.js");
  return {
    ...actual,
    loadSessionEntry: mocks.loadSessionEntry,
    readSessionMessages: mocks.readSessionMessages,
  };
});

function makeContext(overrides: Partial<GatewayRequestContext> = {}): GatewayRequestContext {
  return {
    dedupe: new Map(),
    chatAbortControllers: new Map(),
    chatRunBuffers: new Map(),
    chatDeltaSentAt: new Map(),
    chatAbortedRuns: new Map(),
    agentRunSeq: new Map(),
    addChatRun: vi.fn(),
    removeChatRun: vi.fn(),
    broadcast: vi.fn(),
    nodeSendToSession: vi.fn(),
    registerToolEventRecipient: vi.fn(),
    logGateway: {
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    ...overrides,
  } as unknown as GatewayRequestContext;
}

async function flushMicrotasks(times = 5) {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      setImmediate(() => resolve());
    });
  }
}

describe("chat.send ctx overflow rollover", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-chat-ctx-"));
    mocks.dispatchInboundMessage.mockReset();
    mocks.updateSessionStore.mockReset();
    mocks.loadSessionEntry.mockReset();
    mocks.readSessionMessages.mockReset();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("rolls over sessionId and retries once on ctx overflow", async () => {
    const storePath = path.join(tempDir, "sessions.json");
    const canonicalKey = "agent:main:main";
    const oldSessionId = "old-session";
    const sessionKey = canonicalKey;

    let latestSessionId: string | undefined;
    mocks.updateSessionStore.mockImplementation(async (_storePath: string, updater: any) => {
      const store: Record<string, any> = {
        [canonicalKey]: {
          sessionId: oldSessionId,
          compactionCount: 0,
        },
      };
      updater(store);
      latestSessionId = store[canonicalKey]?.sessionId;
    });

    mocks.loadSessionEntry.mockImplementation((key: string) => {
      expect(key).toBe(sessionKey);
      return {
        cfg: {},
        storePath,
        canonicalKey,
        entry: { sessionId: oldSessionId },
      };
    });

    mocks.readSessionMessages.mockReturnValue([
      {
        role: "user",
        content: [{ type: "text", text: "Earlier context" }],
      },
    ]);

    const overflowMessage =
      "400 request (19498 tokens) exceeds the available context size (16384 tokens)";
    mocks.dispatchInboundMessage
      .mockImplementationOnce(() => Promise.reject(new Error(overflowMessage)))
      .mockImplementationOnce(() => Promise.resolve());

    const context = makeContext();
    const runId = "run-1";

    const respond = vi.fn();
    await chatHandlers["chat.send"]({
      params: {
        sessionKey,
        message: "hi",
        idempotencyKey: runId,
      },
      respond,
      context,
      req: { type: "req", id: "1", method: "chat.send" },
      client: null,
      isWebchatConnect: () => true,
    });

    for (let i = 0; i < 20; i++) {
      if (mocks.dispatchInboundMessage.mock.calls.length >= 2) {
        break;
      }
      await flushMicrotasks(1);
    }

    expect(mocks.dispatchInboundMessage).toHaveBeenCalledTimes(2);
    expect(latestSessionId).toBeTruthy();
    expect(latestSessionId).not.toBe(oldSessionId);

    expect(context.addChatRun).toHaveBeenCalledWith(latestSessionId, {
      sessionKey,
      clientRunId: runId,
    });
    expect((context.chatAbortControllers.get(runId) as any)?.sessionId).toBe(latestSessionId);

    const errorBroadcasts = (context.broadcast as any).mock.calls.filter(
      (call: any[]) => call?.[0] === "chat" && call?.[1]?.state === "error",
    );
    expect(errorBroadcasts).toHaveLength(0);

    const newTranscriptPath = path.join(tempDir, `${latestSessionId}.jsonl`);
    expect(fs.existsSync(newTranscriptPath)).toBe(true);
    const transcript = fs.readFileSync(newTranscriptPath, "utf-8");
    expect(transcript).toContain("[Handoff / Continuation]");
    expect(transcript).toContain("Previous sessionId: old-session");
  });
});
