import type { ProjectNodeMetadataField, ProjectRecord } from "~/lib/projects/types";
import { sanitizeNodeMetadata, createDefaultProjectNodeMetadataSchema } from "./node-metadata";
import type { SpatialMapData } from "~/lib/spatial-map/types";
import { parseSpatialMapData } from "~/lib/spatial-map/validate";

interface SerializedProjectRecord {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  nodeMetadataSchema?: unknown;
  spatialMap?: unknown;
}

export function parseStoredProjectRecord(value: unknown): {
  record: ProjectRecord;
  didNormalize: boolean;
} {
  if (!isRecord(value)) {
    throw new Error("Invalid project record in storage.");
  }

  const record = value as SerializedProjectRecord;
  if (
    typeof record.id !== "string" ||
    typeof record.name !== "string" ||
    typeof record.createdAt !== "string" ||
    typeof record.updatedAt !== "string"
  ) {
    throw new Error("Invalid project record in storage.");
  }

  const nodeMetadataSchema = parseNodeMetadataSchema(record.nodeMetadataSchema);
  const spatialMap = parseSpatialMapData(record.spatialMap, {
    allowedMetadataKeys: nodeMetadataSchema.map((field) => field.key),
  });

  const normalizedRecord: ProjectRecord = {
    id: record.id,
    name: record.name,
    description:
      typeof record.description === "string"
        ? record.description
        : "No project description yet.",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    nodeMetadataSchema,
    spatialMap: normalizeSpatialMapMetadata(spatialMap, nodeMetadataSchema),
  };

  return {
    record: normalizedRecord,
    didNormalize: JSON.stringify(value) !== JSON.stringify(serializeProjectRecord(normalizedRecord)),
  };
}

export function serializeProjectRecord(record: ProjectRecord) {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    nodeMetadataSchema: record.nodeMetadataSchema,
    spatialMap: record.spatialMap,
  };
}

export function parseNodeMetadataSchema(input: unknown): ProjectNodeMetadataField[] {
  if (input === undefined) {
    return createDefaultProjectNodeMetadataSchema();
  }
  if (!Array.isArray(input)) {
    throw new Error("Project nodeMetadataSchema must be an array.");
  }

  const schema = input.map((field, index) => parseNodeMetadataField(field, index));
  const keys = new Set<string>();
  for (const field of schema) {
    if (keys.has(field.key)) {
      throw new Error(`Duplicate project metadata key "${field.key}".`);
    }
    keys.add(field.key);
  }

  return schema;
}

function normalizeSpatialMapMetadata(
  spatialMap: SpatialMapData,
  schema: ProjectNodeMetadataField[],
): SpatialMapData {
  return {
    ...spatialMap,
    nodes: spatialMap.nodes.map((node) => ({
      ...node,
      metadata: sanitizeNodeMetadata(node.metadata, schema, {
        omitDefaultValues: true,
      }),
    })),
  };
}

function parseNodeMetadataField(input: unknown, index: number): ProjectNodeMetadataField {
  if (!isRecord(input)) {
    throw new Error(`Project metadata schema row ${index + 1} must be an object.`);
  }

  const { key, label, defaultValue } = input;
  if (typeof key !== "string" || key.trim().length === 0) {
    throw new Error(`Project metadata schema row ${index + 1} must have a key.`);
  }
  if (typeof label !== "string") {
    throw new Error(`Project metadata schema row ${index + 1} must have a label.`);
  }
  if (typeof defaultValue !== "string") {
    throw new Error(`Project metadata schema row ${index + 1} must have a defaultValue.`);
  }

  return {
    key: key.trim(),
    label: label.trim(),
    defaultValue: defaultValue.trim(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
