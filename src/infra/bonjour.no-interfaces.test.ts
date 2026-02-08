import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logWarn: vi.fn(),
  logDebug: vi.fn(),
}));

vi.mock("../logger.js", async () => {
  const actual = await vi.importActual<typeof import("../logger.js")>("../logger.js");
  return {
    ...actual,
    logWarn: (message: string) => mocks.logWarn(message),
    logDebug: (message: string) => mocks.logDebug(message),
    logInfo: vi.fn(),
    logError: vi.fn(),
    logSuccess: vi.fn(),
  };
});

vi.mock("@homebridge/ciao", () => {
  return {
    Protocol: { TCP: "tcp" },
    getResponder: () => {
      throw new Error("no interfaces found");
    },
  };
});

const prevEnv = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in prevEnv)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(prevEnv)) {
    process.env[key] = value;
  }
  mocks.logWarn.mockReset();
  mocks.logDebug.mockReset();
  vi.restoreAllMocks();
});

describe("gateway bonjour advertiser (no interfaces)", () => {
  it("does not throw if ciao reports no interfaces", async () => {
    // Allow advertiser to run in unit tests.
    delete process.env.VITEST;
    process.env.NODE_ENV = "development";

    const { startGatewayBonjourAdvertiser } = await import("./bonjour.js");

    const advertiser = await startGatewayBonjourAdvertiser({
      gatewayPort: 18789,
      sshPort: 2222,
    });

    await expect(advertiser.stop()).resolves.toBeUndefined();
    expect(mocks.logWarn).toHaveBeenCalled();
    expect(String(mocks.logWarn.mock.calls[0]?.[0] ?? "").toLowerCase()).toContain("disabled");
  });
});
