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

- Root cause: the Control UI (operator/webchat role) attempted to call `node.event` to subscribe to chat events, but `node.event` is **node-role only** and the gateway correctly rejects it (`unauthorized role: operator`). That meant the subscription never actually happened, and the UI depended on a stream it could not legally subscribe to.
- Fix: remove the invalid `node.event` subscription calls from the Control UI, and make the gateway reliably emit `event:"chat"` for browser clients by registering the chat run mapping at `chat.send` start (`context.addChatRun(...)`). The UI still keeps the watchdog fallback (poll `chat.send` by `idempotencyKey` and refresh `chat.history`) and clears run state on socket close.

## Files changed (high level)

- Backend: `src/gateway/server-methods/chat.ts`
- UI: `ui/src/ui/controllers/chat.ts`, `ui/src/ui/app-gateway.ts`
