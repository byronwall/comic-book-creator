export const speechBubblePath =
  "M1 24 C16 7 84 7 99 24 L99 76 C94 81 89 84 82 86 L74 99 L66 87 C42 90 15 87 1 76 Z";

export const lineHeightMultiplier = 1.08;

export function getDefaultTextHeight(kind: string, text: string, fontSize: number) {
  const lineCount = Math.max(1, text.split("\n").length);
  const contentHeight = lineCount * fontSize * lineHeightMultiplier;
  const legacyPixelHeight =
    kind === "speech"
      ? Math.max(52, contentHeight + 24) + 24
      : kind === "thought"
        ? Math.max(48, contentHeight + 26) + 34
        : kind === "caption"
          ? Math.max(38, contentHeight + 18) + 10
          : Math.max(56, contentHeight + 8) + 10;

  return Math.min(50, Math.max(5, legacyPixelHeight / 7));
}
