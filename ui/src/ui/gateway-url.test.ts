import { describe, expect, it } from "vitest";
import { normalizeGatewayWsUrl } from "./gateway-url.ts";

describe("normalizeGatewayWsUrl", () => {
  it("passes through ws urls", () => {
    expect(normalizeGatewayWsUrl("ws://127.0.0.1:18789")).toBe("ws://127.0.0.1:18789");
    expect(normalizeGatewayWsUrl("wss://example.com")).toBe("wss://example.com");
  });

  it("converts http(s) to ws(s)", () => {
    expect(normalizeGatewayWsUrl("http://127.0.0.1:18789/openclaw/")).toBe(
      "ws://127.0.0.1:18789/openclaw/",
    );
    expect(normalizeGatewayWsUrl("https://example.com")).toBe("wss://example.com");
  });

  it("prefixes bare hosts with ws://", () => {
    expect(normalizeGatewayWsUrl("127.0.0.1:18789")).toBe("ws://127.0.0.1:18789");
    expect(normalizeGatewayWsUrl("localhost:18789/openclaw")).toBe("ws://localhost:18789/openclaw");
  });

  it("trims whitespace", () => {
    expect(normalizeGatewayWsUrl("  127.0.0.1:18789  ")).toBe("ws://127.0.0.1:18789");
  });
});
