export type PendingChatSend = {
  runId: string;
  text: string;
  ts: number;
};

const CHAT_DRAFT_STORAGE_KEY_PREFIX = "openclaw.chat.draft.v1:";
const CHAT_PENDING_SEND_STORAGE_KEY_PREFIX = "openclaw.chat.pendingSend.v1:";

const PENDING_SEND_MAX_AGE_MS = 15 * 60 * 1000;

function resolveDraftKey(sessionKey: string): string {
  return `${CHAT_DRAFT_STORAGE_KEY_PREFIX}${sessionKey}`;
}

function resolvePendingKey(sessionKey: string): string {
  return `${CHAT_PENDING_SEND_STORAGE_KEY_PREFIX}${sessionKey}`;
}

function canUseStorage(): boolean {
  return globalThis.window !== undefined && globalThis.localStorage !== undefined;
}

function readPending(sessionKey: string): PendingChatSend | null {
  if (!canUseStorage()) {
    return null;
  }
  try {
    const raw = globalThis.localStorage.getItem(resolvePendingKey(sessionKey));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    const runId = (parsed as { runId?: unknown })?.runId;
    const text = (parsed as { text?: unknown })?.text;
    const ts = (parsed as { ts?: unknown })?.ts;
    if (typeof runId !== "string" || typeof text !== "string" || typeof ts !== "number") {
      return null;
    }
    return { runId, text, ts };
  } catch {
    return null;
  }
}

function isPendingExpired(pending: PendingChatSend): boolean {
  const ageMs = Date.now() - pending.ts;
  return !Number.isFinite(ageMs) || ageMs < 0 || ageMs > PENDING_SEND_MAX_AGE_MS;
}

export function loadChatDraftFromStorage(sessionKey: string): string {
  if (!canUseStorage()) {
    return "";
  }
  try {
    const raw = globalThis.localStorage.getItem(resolveDraftKey(sessionKey));
    const draft = typeof raw === "string" ? raw : "";
    if (draft) {
      return draft;
    }

    const pending = readPending(sessionKey);
    if (pending && !isPendingExpired(pending) && pending.text) {
      return pending.text;
    }
    return "";
  } catch {
    return "";
  }
}

export function saveChatDraftToStorage(sessionKey: string, draft: string) {
  if (!canUseStorage()) {
    return;
  }
  try {
    const key = resolveDraftKey(sessionKey);
    const trimmed = draft;
    if (!trimmed) {
      globalThis.localStorage.removeItem(key);
      return;
    }
    globalThis.localStorage.setItem(key, trimmed);
  } catch {
    // ignore
  }
}

export function savePendingChatSendToStorage(sessionKey: string, pending: PendingChatSend) {
  if (!canUseStorage()) {
    return;
  }
  try {
    if (!pending.text) {
      globalThis.localStorage.removeItem(resolvePendingKey(sessionKey));
      return;
    }
    globalThis.localStorage.setItem(resolvePendingKey(sessionKey), JSON.stringify(pending));
  } catch {
    // ignore
  }
}

export function clearPendingChatSendForRun(sessionKey: string, runId: string) {
  if (!canUseStorage()) {
    return;
  }
  try {
    const pending = readPending(sessionKey);
    if (!pending) {
      return;
    }
    if (isPendingExpired(pending) || pending.runId === runId) {
      globalThis.localStorage.removeItem(resolvePendingKey(sessionKey));
    }
  } catch {
    // ignore
  }
}
