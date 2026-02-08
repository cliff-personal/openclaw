# Change Log

Date: 2026-02-08

## Summary

- WebChat/Control UI: recover from context overflow by resetting session and auto-retrying (capped).
- Control UI: improve chat compose UX with input history (localStorage), up/down navigation, and clear “Processing…” / disabled Send while busy.
- Gateway: add more debug/warn/error logs around `chat.send` for easier troubleshooting.
- UI: render assistant `errorMessage` even when assistant `content` is empty (prevents blank bubbles).
- Tests/docs: add coverage for overflow recovery and document the behavior.

## Files changed (high level)

- Backend: `src/auto-reply/reply/*`, `src/agents/pi-embedded-helpers/errors.ts`, `src/gateway/*`
- UI: `ui/src/ui/*`, `ui/src/styles/chat/*`
- Docs: `docs/concepts/session.md`
- Dev tooling: `.vscode/launch.json`, `.vscode/tasks.json`
