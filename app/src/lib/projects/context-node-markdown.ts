export interface MarkdownHeadingSection {
  level: number;
  label: string;
  parentIndex: number | null;
  context: string;
}

interface SplitMarkdownIntoHeadingSectionsOptions {
  maxHeadingDepth?: number;
}

interface MutableMarkdownHeadingSection {
  level: number;
  label: string;
  parentIndex: number | null;
  bodyLines: string[];
}

const ATX_HEADING_PATTERN = /^( {0,3})(#{1,6})[ \t]+(.+?)(?:[ \t]+#+[ \t]*)?$/;
const FENCE_PATTERN = /^( {0,3})(`{3,}|~{3,})/;

export function detectMarkdownMaxHeadingDepth(markdown: string) {
  return parseMarkdownHeadingSections(markdown).maxHeadingDepth;
}

export function splitMarkdownIntoHeadingSections(
  markdown: string,
  options: SplitMarkdownIntoHeadingSectionsOptions = {},
): {
  preamble: string;
  sections: MarkdownHeadingSection[];
} {
  const parsed = parseMarkdownHeadingSections(markdown, options);

  return {
    preamble: parsed.preamble,
    sections: parsed.sections,
  };
}

function parseMarkdownHeadingSections(
  markdown: string,
  options: SplitMarkdownIntoHeadingSectionsOptions = {},
) {
  const lines = markdown.split(/\r?\n/);
  const sections: MutableMarkdownHeadingSection[] = [];
  const preambleLines: string[] = [];
  const headingStack: Array<{ level: number }> = [];
  const includedHeadingStack: Array<{ index: number; level: number }> = [];
  const maxHeadingDepth =
    typeof options.maxHeadingDepth === "number" && Number.isFinite(options.maxHeadingDepth)
      ? Math.max(1, Math.floor(options.maxHeadingDepth))
      : null;
  let detectedMaxHeadingDepth = 0;
  let activeSectionIndex: number | null = null;
  let activeFenceMarker: string | null = null;

  for (const line of lines) {
    const fenceMatch = line.match(FENCE_PATTERN);
    if (fenceMatch) {
      const marker = fenceMatch[2]?.[0] ?? null;
      if (marker) {
        if (activeFenceMarker === marker) {
          activeFenceMarker = null;
        } else if (activeFenceMarker === null) {
          activeFenceMarker = marker;
        }
      }
    }

    const headingMatch =
      activeFenceMarker === null ? line.match(ATX_HEADING_PATTERN) : null;

    if (headingMatch) {
      const level = headingMatch[2].length;
      const rawLabel = headingMatch[3]?.trim() ?? "";
      const label = rawLabel.replace(/[ \t]+#+$/, "").trim();

      if (label.length === 0) {
        continue;
      }

      while (headingStack.length > 0) {
        const lastHeading = headingStack[headingStack.length - 1];
        if (!lastHeading || lastHeading.level < level) {
          break;
        }
        headingStack.pop();
      }

      const headingDepth = headingStack.length + 1;
      detectedMaxHeadingDepth = Math.max(detectedMaxHeadingDepth, headingDepth);
      headingStack.push({ level });

      while (includedHeadingStack.length > 0) {
        const lastIncludedHeading = includedHeadingStack[includedHeadingStack.length - 1];
        if (!lastIncludedHeading || lastIncludedHeading.level < level) {
          break;
        }
        includedHeadingStack.pop();
      }

      if (maxHeadingDepth !== null && headingDepth > maxHeadingDepth) {
        const parentSectionIndex = includedHeadingStack[includedHeadingStack.length - 1]?.index;
        if (parentSectionIndex === undefined) {
          preambleLines.push(line);
          activeSectionIndex = null;
        } else {
          sections[parentSectionIndex]?.bodyLines.push(line);
          activeSectionIndex = parentSectionIndex;
        }
        continue;
      }

      const parentIndex =
        includedHeadingStack[includedHeadingStack.length - 1]?.index ?? null;
      const nextSectionIndex = sections.length;
      sections.push({
        level,
        label,
        parentIndex,
        bodyLines: [],
      });
      includedHeadingStack.push({ index: nextSectionIndex, level });
      activeSectionIndex = nextSectionIndex;
      continue;
    }

    if (activeSectionIndex === null) {
      preambleLines.push(line);
      continue;
    }

    sections[activeSectionIndex]?.bodyLines.push(line);
  }

  return {
    preamble: trimMarkdownBlock(preambleLines.join("\n")),
    maxHeadingDepth: detectedMaxHeadingDepth,
    sections: sections.map((section) => ({
      level: section.level,
      label: section.label,
      parentIndex: section.parentIndex,
      context: trimMarkdownBlock(section.bodyLines.join("\n")),
    })),
  };
}

function trimMarkdownBlock(value: string) {
  return value.replace(/^\s+|\s+$/g, "");
}
