import { describe, expect, it } from "vitest";
import { isLikelyChatSlashCommandText } from "./slash-command.js";

describe("isLikelyChatSlashCommandText", () => {
  it("detects simple slash commands", () => {
    expect(isLikelyChatSlashCommandText("/reset")).toBe(true);
    expect(isLikelyChatSlashCommandText("/reset now")).toBe(true);
    expect(isLikelyChatSlashCommandText("/think low")).toBe(true);
    expect(isLikelyChatSlashCommandText("/stop")).toBe(true);
  });

  it("does not treat absolute paths as commands", () => {
    expect(isLikelyChatSlashCommandText("/Users/cliff/workspace/openclaw")).toBe(false);
    expect(isLikelyChatSlashCommandText("/tmp")).toBe(false);
    expect(isLikelyChatSlashCommandText("/usr/bin/node")).toBe(false);
    expect(isLikelyChatSlashCommandText("/var/log/system.log")).toBe(false);
  });

  it("does not treat random slash-prefixed text as a command", () => {
    expect(isLikelyChatSlashCommandText("/")).toBe(false);
    expect(isLikelyChatSlashCommandText("//")).toBe(false);
    expect(isLikelyChatSlashCommandText("/Foo")).toBe(false);
    expect(isLikelyChatSlashCommandText("/with.dot")).toBe(false);
  });
});
