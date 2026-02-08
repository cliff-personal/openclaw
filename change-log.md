# Change Log

Date: 2026-02-08

## Summary

- WebChat/Control UI: recover from context overflow by resetting session and auto-retrying (capped).
- Control UI: improve chat compose UX with input history (localStorage), up/down navigation, and clear “Processing…” / disabled Send while busy.
- Control UI: render assistant replies immediately on `chat` `final`/`error` events (append message locally), and avoid `chat.history` overwriting newer local messages right after send (fixes “blank until refresh” reports).
- Gateway: add more debug/warn/error logs around `chat.send` for easier troubleshooting.
- UI: render assistant `errorMessage` even when assistant `content` is empty (prevents blank bubbles).
- Tests/docs: add coverage for overflow recovery and document the behavior.
- Control UI Chat: fix “Send looks stuck / Processing…” when the gateway never delivers `chat` events (e.g. gateway restart/OOM, event stream interruption) by adding a watchdog that polls `chat.send` status (idempotencyKey) and refreshes `chat.history` on completion.
- Control UI Chat: clear in-flight run state on WebSocket `onClose` so the UI doesn't stay busy after disconnects.
- Dev tooling: isolated debug gateway now writes `gateway.auth.token` into the isolated config so the debug gateway can start in token-auth mode.

## Root cause & fix

- Root cause: Control UI relies on `event: "chat"` (`delta/final/error/aborted`) to clear `chatRunId` and render replies. In practice, most chat events are emitted via `nodeSendToSession(sessionKey, "chat", ...)`, which requires the client to subscribe to that session via `node.event` → `chat.subscribe`. Without that subscription, the gateway still returns `status:"started"`, but the UI sees no `event:"chat"` frames and appears unresponsive.
- Fix: Subscribe the Control UI connection to the active session before sending (`chat.subscribe`), remove the old forced `deliver:false`, and add a best-effort completion watchdog (poll `chat.send` by `idempotencyKey` until `ok/error`, then refresh history + clear busy state). Also clear run state immediately on socket close.

## Files changed (high level)

- Backend: `src/auto-reply/reply/*`, `src/agents/pi-embedded-helpers/errors.ts`, `src/gateway/*`
- UI: `ui/src/ui/*`, `ui/src/styles/chat/*`
- Docs: `docs/concepts/session.md`
- Dev tooling: `.vscode/launch.json`, `.vscode/tasks.json`
