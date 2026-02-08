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
- Control UI Chat: persist the compose draft in localStorage (per sessionKey) so a refresh doesn't wipe unsent text.
- Gateway/UI: include a best-effort `summary` in `chat.send` completion polling responses so the UI can render something even if `chat` events/transcript lag.
- Dev tooling: remove the isolated debug gateway (18790) VS Code launch/tasks; keep a single gateway debug target on 18789 using the default environment/config.
- Gateway: ensure `chat.send` updates the session store so `chat.history` resolves the correct session/transcript.
- Gateway: make `chat.send` polling complete only on agent lifecycle end/error (prevents premature `ok`/empty `final` on slow models).
- Gateway: avoid duplicate transcript writes when the UI polls `chat.send` with the same `idempotencyKey`.
- Gateway/UI Chat: include `startedAtMs`/`expiresAtMs`/`timeoutMs` in `chat.send` `started`/`in_flight` responses; render a best-effort processing progress bar + ETA in the Control UI.
- Gateway: avoid treating absolute paths like `/Users/...` as slash-commands.
- Control UI Chat: extend the watchdog polling deadline based on the gateway run window (`expiresAtMs`) to avoid false “timed out” errors on long runs.
- Gateway: disable Bonjour/mDNS gracefully when `@homebridge/ciao` reports “no interfaces found” (prevents startup crashes in constrained environments).
- Control UI Chat: improve IME Enter handling (avoid sending on IME confirm) and centralize draft/pending-send persistence.
- Dev tooling: add a VS Code launch config for debugging the Control UI in Chrome (Vite on 5173).

## Root cause & fix

- Root cause: the Control UI (operator/webchat role) attempted to call `node.event` to subscribe to chat events, but `node.event` is **node-role only** and the gateway correctly rejects it (`unauthorized role: operator`). That meant the subscription never actually happened, and the UI depended on a stream it could not legally subscribe to.
- Fix: remove the invalid `node.event` subscription calls from the Control UI, and make the gateway reliably emit `event:"chat"` for browser clients by registering the chat run mapping at `chat.send` start (`context.addChatRun(...)`). The UI still keeps the watchdog fallback (poll `chat.send` by `idempotencyKey` and refresh `chat.history`) and clears run state on socket close.

## Files changed (high level)

- Backend: `src/gateway/server-methods/chat.ts`
- UI: `ui/src/ui/controllers/chat.ts`, `ui/src/ui/app-gateway.ts`
