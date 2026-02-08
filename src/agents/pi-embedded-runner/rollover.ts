import { randomUUID } from "node:crypto";
import path from "node:path";
import type { CompactEmbeddedPiSessionParams } from "./compact.js";
import { ensureSessionHeader } from "../pi-embedded-helpers.js";
import { log } from "./logger.js";

export type SessionRolloverResult = {
  ok: boolean;
  newSessionId?: string;
  newSessionFile?: string;
  reason?: string;
};

export async function performSessionRollover(
  params: CompactEmbeddedPiSessionParams & { priorSessionId: string },
): Promise<SessionRolloverResult> {
  const { sessionFile, workspaceDir, priorSessionId } = params;

  try {
    const sessionDir = path.dirname(sessionFile);
    const newSessionId = randomUUID();
    const newSessionFile = path.join(sessionDir, `${newSessionId}.jsonl`);

    // Create the new session file with header
    await ensureSessionHeader({
      sessionFile: newSessionFile,
      sessionId: newSessionId,
      cwd: workspaceDir,
    });

    log.info(`[rollover] Rolled over session ${priorSessionId} -> ${newSessionId}`);

    return {
      ok: true,
      newSessionId,
      newSessionFile,
    };
  } catch (err) {
    log.error(`[rollover] Failed to rollover session: ${err}`);
    return {
      ok: false,
      reason: String(err),
    };
  }
}
