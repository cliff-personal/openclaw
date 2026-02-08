export function normalizeGatewayWsUrl(raw: string): string {
  const input = String(raw ?? "").trim();
  if (!input) {
    return "";
  }

  if (/^wss?:\/\//i.test(input)) {
    return input;
  }

  if (/^https?:\/\//i.test(input)) {
    // http -> ws, https -> wss
    return input.replace(/^http/i, "ws");
  }

  // Common paste: "127.0.0.1:18789" or "localhost:18789/openclaw".
  return `ws://${input}`;
}
