import { describe, expect, it } from "vitest";
import { handleChatEvent, loadChatHistory, type ChatEventPayload, type ChatState } from "./chat.ts";

function createState(overrides: Partial<ChatState> = {}): ChatState {
  return {
    chatAttachments: [],
    chatLoading: false,
    chatMessage: "",
    chatMessages: [],
    chatRunId: null,
    chatRunStartedAtMs: null,
    chatRunExpiresAtMs: null,
    chatSending: false,
    chatStream: null,
    chatStreamStartedAt: null,
    chatThinkingLevel: null,
    client: null,
    connected: true,
    lastError: null,
    sessionKey: "main",
    ...overrides,
  };
}

describe("handleChatEvent", () => {
  it("returns null when payload is missing", () => {
    const state = createState();
    expect(handleChatEvent(state, undefined)).toBe(null);
  });

  it("returns null when sessionKey does not match", () => {
    const state = createState({ sessionKey: "main" });
    const payload: ChatEventPayload = {
      runId: "run-1",
      sessionKey: "other",
      state: "final",
    };
    expect(handleChatEvent(state, payload)).toBe(null);
  });

  it("returns null for delta from another run", () => {
    const state = createState({
      sessionKey: "main",
      chatRunId: "run-user",
      chatStream: "Hello",
    });
    const payload: ChatEventPayload = {
      runId: "run-announce",
      sessionKey: "main",
      state: "delta",
      message: { role: "assistant", content: [{ type: "text", text: "Done" }] },
    };
    expect(handleChatEvent(state, payload)).toBe(null);
    expect(state.chatRunId).toBe("run-user");
    expect(state.chatStream).toBe("Hello");
  });

  it("returns 'final' for final from another run (e.g. sub-agent announce) without clearing state", () => {
    const state = createState({
      sessionKey: "main",
      chatRunId: "run-user",
      chatStream: "Working...",
      chatStreamStartedAt: 123,
    });
    const payload: ChatEventPayload = {
      runId: "run-announce",
      sessionKey: "main",
      state: "final",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "Sub-agent findings" }],
      },
    };
    expect(handleChatEvent(state, payload)).toBe("final");
    expect(state.chatRunId).toBe("run-user");
    expect(state.chatStream).toBe("Working...");
    expect(state.chatStreamStartedAt).toBe(123);
  });

  it("processes final from own run and clears state", () => {
    const state = createState({
      sessionKey: "main",
      chatRunId: "run-1",
      chatStream: "Reply",
      chatStreamStartedAt: 100,
    });
    const payload: ChatEventPayload = {
      runId: "run-1",
      sessionKey: "main",
      state: "final",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "Hello" }],
        timestamp: 123,
      },
    };
    expect(handleChatEvent(state, payload)).toBe("final");
    expect(state.chatRunId).toBe(null);
    expect(state.chatStream).toBe(null);
    expect(state.chatStreamStartedAt).toBe(null);
    expect(state.chatMessages).toHaveLength(1);
  });

  it("appends an error message bubble on error", () => {
    const state = createState({
      sessionKey: "main",
      chatRunId: "run-1",
      chatStream: "Working",
    });
    const payload: ChatEventPayload = {
      runId: "run-1",
      sessionKey: "main",
      state: "error",
      errorMessage: "context overflow",
    };
    expect(handleChatEvent(state, payload)).toBe("error");
    expect(state.chatRunId).toBe(null);
    expect(state.chatStream).toBe(null);
    expect(state.lastError).toBe("context overflow");
    expect(state.chatMessages).toHaveLength(1);
  });
});

describe("loadChatHistory", () => {
  it("preserves recent local tail messages when server history is stale", async () => {
    const now = Date.now();
    const state = createState({
      connected: true,
      client: {
        request: async () => ({
          messages: [
            {
              role: "assistant",
              content: [{ type: "text", text: "older" }],
              timestamp: now - 10_000,
            },
            { role: "user", content: [{ type: "text", text: "previous" }], timestamp: now - 9_000 },
          ],
        }),
      } as unknown as ChatState["client"],
      chatMessages: [
        { role: "assistant", content: [{ type: "text", text: "older" }], timestamp: now - 10_000 },
        { role: "user", content: [{ type: "text", text: "previous" }], timestamp: now - 9_000 },
        { role: "user", content: [{ type: "text", text: "just sent" }], timestamp: now - 250 },
      ],
    });

    await loadChatHistory(state);
    const texts = state.chatMessages.map((m) => {
      const msg = m as any;
      const content = Array.isArray(msg?.content) ? msg.content : [];
      const first = content[0];
      return typeof first?.text === "string" ? first.text : "";
    });
    expect(texts).toContain("just sent");
  });

  it("does not duplicate preserved tail messages", async () => {
    const now = Date.now();
    const local = { role: "user", content: [{ type: "text", text: "echo" }], timestamp: now - 250 };
    const state = createState({
      connected: true,
      client: {
        request: async () => ({
          messages: [
            {
              role: "assistant",
              content: [{ type: "text", text: "older" }],
              timestamp: now - 10_000,
            },
            local,
          ],
        }),
      } as unknown as ChatState["client"],
      chatMessages: [
        { role: "assistant", content: [{ type: "text", text: "older" }], timestamp: now - 10_000 },
        local,
      ],
    });

    await loadChatHistory(state);
    const echoes = state.chatMessages.filter((m) => {
      const msg = m as any;
      return msg?.role === "user" && msg?.content?.[0]?.text === "echo";
    });
    expect(echoes).toHaveLength(1);
  });
});
