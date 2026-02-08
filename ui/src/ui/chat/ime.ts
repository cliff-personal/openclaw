export function isLikelyImeConfirmEnter(e: KeyboardEvent, target: HTMLTextAreaElement): boolean {
  if (e.isComposing) {
    return true;
  }

  // Some browsers report IME-confirm keys as Process/Unidentified.
  if (e.key === "Process" || e.key === "Unidentified") {
    return true;
  }

  const composing = target.dataset.composing === "1";
  if (composing) {
    return true;
  }

  const lastEndRaw = target.dataset.lastCompositionEndAt;
  const lastEndAt = lastEndRaw ? Number(lastEndRaw) : 0;
  if (!Number.isFinite(lastEndAt) || lastEndAt <= 0) {
    return false;
  }

  // Guard against the common sequence where compositionend is immediately followed
  // by an Enter keydown. That Enter is typically confirming IME, not sending.
  return Date.now() - lastEndAt < 200;
}
