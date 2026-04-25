import type { MapNode } from "~/lib/spatial-map/types";
import type { ProjectNodeMetadataField } from "./types";

export const DEFAULT_NOTE_PURPOSE =
  "Loose context, notes, and markdown content that needs a home in the map.";
export const DEFAULT_NOTE_IMPLEMENTATION =
  "Freeform markdown note stored directly on the node for AI or human editing.";

const DEFAULT_NODE_METADATA_SCHEMA: ProjectNodeMetadataField[] = [
  {
    key: "purpose",
    label: "Purpose",
    defaultValue: DEFAULT_NOTE_PURPOSE,
  },
  {
    key: "implementation",
    label: "Implementation",
    defaultValue: DEFAULT_NOTE_IMPLEMENTATION,
  },
];

export function createDefaultProjectNodeMetadataSchema(): ProjectNodeMetadataField[] {
  return DEFAULT_NODE_METADATA_SCHEMA.map((field) => ({ ...field }));
}

export function normalizeProjectNodeMetadataKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeProjectNodeMetadataLabel(value: string, fallbackKey: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallbackKey;
}

export function getProjectNodeMetadataField(
  schema: ProjectNodeMetadataField[],
  key: string,
) {
  return schema.find((field) => field.key === key);
}

export function sanitizeNodeMetadata(
  input: Record<string, unknown> | null | undefined,
  schema: ProjectNodeMetadataField[],
  options: { omitDefaultValues?: boolean } = {},
): Record<string, string> {
  const source = input ?? {};
  const nextEntries = schema.flatMap((field) => {
    const rawValue = source[field.key];
    if (typeof rawValue !== "string") {
      return [];
    }

    const value = rawValue.trim();
    if (value.length === 0) {
      return [];
    }
    if (options.omitDefaultValues && value === field.defaultValue) {
      return [];
    }

    return [[field.key, value] satisfies [string, string]];
  });

  return Object.fromEntries(nextEntries);
}

export function getNodeMetadataEntries(
  node: Pick<MapNode, "metadata">,
  schema: ProjectNodeMetadataField[],
) {
  return schema.flatMap((field) => {
    const value = node.metadata[field.key]?.trim() ?? "";
    if (value.length === 0) {
      return [];
    }

    return [{ ...field, value }];
  });
}

export function getNodePrimaryMetadataEntry(
  node: Pick<MapNode, "metadata">,
  schema: ProjectNodeMetadataField[],
) {
  const purposeField = getProjectNodeMetadataField(schema, "purpose");
  const purposeValue =
    purposeField && node.metadata[purposeField.key]
      ? node.metadata[purposeField.key]!.trim()
      : "";
  if (purposeField && purposeValue.length > 0) {
    return { ...purposeField, value: purposeValue };
  }

  return getNodeMetadataEntries(node, schema)[0];
}

export function getNodePrimaryMetadataText(
  node: Pick<MapNode, "metadata">,
  schema: ProjectNodeMetadataField[],
  fallback = "",
) {
  return getNodePrimaryMetadataEntry(node, schema)?.value ?? fallback;
}

export function summarizeNodeMetadata(
  node: Pick<MapNode, "metadata">,
  schema: ProjectNodeMetadataField[],
) {
  const entries = getNodeMetadataEntries(node, schema);
  if (entries.length === 0) {
    return "No metadata";
  }

  return entries.map((entry) => `${entry.label}: ${entry.value}`).join("; ");
}
