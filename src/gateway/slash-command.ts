const POSIX_ROOT_PATHS = new Set([
  "/Applications",
  "/Library",
  "/System",
  "/Users",
  "/Volumes",
  "/bin",
  "/dev",
  "/etc",
  "/home",
  "/opt",
  "/private",
  "/proc",
  "/sbin",
  "/tmp",
  "/usr",
  "/var",
]);

function firstToken(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }
  const idx = trimmed.search(/\s/);
  return idx === -1 ? trimmed : trimmed.slice(0, idx);
}

function looksLikePosixPath(token: string): boolean {
  if (!token.startsWith("/")) {
    return false;
  }
  if (token === "/") {
    return true;
  }
  if (POSIX_ROOT_PATHS.has(token)) {
    return true;
  }
  // Any additional slash after the leading one strongly suggests a filesystem path.
  if (token.indexOf("/", 1) !== -1) {
    return true;
  }
  return false;
}

/**
 * True if the message looks like a chat slash-command (e.g. `/reset`, `/think`).
 *
 * Important: do NOT treat absolute paths like `/Users/cliff/...` as commands.
 */
export function isLikelyChatSlashCommandText(text: string): boolean {
  const token = firstToken(text);
  if (!token.startsWith("/")) {
    return false;
  }
  if (looksLikePosixPath(token)) {
    return false;
  }
  // Commands are a single slash-prefixed word.
  // Keep it conservative to avoid misclassifying user text.
  return /^\/[a-z][a-z0-9_-]*$/.test(token);
}
