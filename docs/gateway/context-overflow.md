# Context overflow

This page explains what **context overflow** is, how it shows up in OpenClaw, and what OpenClaw can do to recover.

## What it looks like

You’ll typically see an error like one of these:

- `request (19952 tokens) exceeds the available context size (16384 tokens)` (common with local `llama-server`)
- `maximum context length is ... tokens` (common with OpenAI-compatible providers)
- `prompt is too long` / `context overflow`

In all cases, the core problem is the same: the request (system prompt + chat history + tool outputs + your message + the model’s planned output) doesn’t fit in the model’s context window.

## Why it happens

The most common causes are:

- Long-running sessions where history grows over time
- Large tool results (logs, files, web pages, JSON)
- Large user input (pasting big documents)
- `maxTokens` set too high relative to the model context window
- A provider/server configured with a smaller context than the model entry claims (for example, `llama-server --ctx-size` vs `models.providers.*.models[].contextWindow`)

## Recovery design in OpenClaw

OpenClaw uses a best-effort, capped recovery strategy.

### 1) Auto-compaction (when applicable)

When the agent runtime detects context overflow, it may attempt **auto-compaction** (summarize/trim history) and retry. This is most effective when the overflow is caused by accumulated history.

### 2) Session rollover (fresh session id)

If the run still can’t proceed, OpenClaw starts a **fresh session id** for the same `sessionKey`.

In the Control UI (WebChat), OpenClaw can also inject a short **handoff** message into the new session and automatically retry once.

What the handoff contains:

- Previous session id and new session id
- A short excerpt of recent messages (best-effort)
- The user’s latest request (so the model can continue)

### 3) Hard stop (when the input itself is too large)

If your single message is too large even for an empty session, retries won’t help. You must shorten the input or use a larger-context model.

## Notes and limitations

- Retries are capped to avoid infinite loops.
- If a session is pinned to a fixed transcript file (`sessionFile`), OpenClaw may not be able to safely roll over to a fresh transcript.
- Some channels may reset the session but still require you to re-send, depending on delivery constraints.

## What you can do (recommended order)

1. Shorten the prompt

- Remove large pasted logs/JSON; attach files instead when possible
- Ask the agent to summarize the long content first, then ask the real question

2. Reduce `maxTokens`

If your model entry has `contextWindow: 16384` and `maxTokens: 4096`, the _worst-case_ request is often too large once history grows.
Reducing `maxTokens` gives the prompt more headroom.

3. Increase the provider/server context window

For local `llama-server`, ensure the server context and OpenClaw model config agree:

- `llama-server --ctx-size <N>` (server)
- `models.providers.<provider>.models[].contextWindow: <N>` (OpenClaw)

4. Start a new session

In chat surfaces that support it, use `/new` or `/reset` to start fresh, then continue.

## Where to look for evidence

- Control UI: you should see a new session start and a handoff message.
- Transcripts: session JSONL files may include a `ctx_overflow` event line.
- Gateway logs: `chat.send failed ... exceeds the available context size ...`
