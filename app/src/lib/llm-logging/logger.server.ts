import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

interface LlmLogEvent {
  stage: string;
  message: string;
  timestamp: string;
  data?: JsonValue;
}

interface LlmLogCall {
  id: string;
  label: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  status: "running" | "completed" | "failed";
  request: JsonValue;
  response?: JsonValue;
  error?: JsonValue;
}

interface LlmSessionArtifact {
  version: 1;
  sessionId: string;
  pipeline: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  metadata?: JsonValue;
  result?: JsonValue;
  error?: JsonValue;
  events: LlmLogEvent[];
  llmCalls: LlmLogCall[];
}

interface LlmSessionDefinition {
  metadata?: unknown;
  startedAt?: string;
}

interface LlmSessionEventInput {
  data?: unknown;
  message: string;
  stage: string;
}

interface LlmCallDefinition {
  callId: string;
  label: string;
  request: unknown;
}

interface LlmCallResult {
  error?: unknown;
  response?: unknown;
}

const sessionWriteQueues = new Map<string, Promise<void>>();

export async function startLlmSession(
  pipeline: string,
  sessionId: string,
  definition: LlmSessionDefinition = {},
) {
  await updateSessionArtifact(pipeline, sessionId, (artifact) => {
    artifact.pipeline = pipeline;
    artifact.status = "running";
    artifact.startedAt = definition.startedAt ?? artifact.startedAt;
    artifact.metadata = serializeJsonValue(definition.metadata);
  });
}

export async function recordLlmSessionEvent(
  pipeline: string,
  sessionId: string,
  event: LlmSessionEventInput,
) {
  await updateSessionArtifact(pipeline, sessionId, (artifact) => {
    artifact.events.push({
      stage: event.stage,
      message: event.message,
      timestamp: new Date().toISOString(),
      data: serializeJsonValue(event.data),
    });
  });
}

export async function completeLlmSession(
  pipeline: string,
  sessionId: string,
  result?: unknown,
) {
  await updateSessionArtifact(pipeline, sessionId, (artifact) => {
    artifact.status = "completed";
    artifact.completedAt = new Date().toISOString();
    artifact.result = serializeJsonValue(result);
  });
}

export async function failLlmSession(
  pipeline: string,
  sessionId: string,
  error: unknown,
) {
  await updateSessionArtifact(pipeline, sessionId, (artifact) => {
    artifact.status = "failed";
    artifact.completedAt = new Date().toISOString();
    artifact.error = serializeJsonValue(error);
  });
}

export async function withLlmCallLogging<T>(
  pipeline: string,
  sessionId: string,
  definition: LlmCallDefinition,
  operation: () => Promise<T>,
  buildResult: (value: T) => LlmCallResult,
) {
  const startedAt = new Date().toISOString();
  await updateSessionArtifact(pipeline, sessionId, (artifact) => {
    artifact.llmCalls.push({
      id: definition.callId,
      label: definition.label,
      startedAt,
      status: "running",
      request: serializeJsonValue(definition.request) ?? null,
    });
  });

  try {
    const value = await operation();
    const result = buildResult(value);
    await updateSessionArtifact(pipeline, sessionId, (artifact) => {
      const call = artifact.llmCalls.find((entry) => entry.id === definition.callId);
      if (!call) {
        return;
      }

      const completedAt = new Date().toISOString();
      call.status = "completed";
      call.completedAt = completedAt;
      call.durationMs = Date.parse(completedAt) - Date.parse(call.startedAt);
      call.response = serializeJsonValue(result.response);
      call.error = undefined;
    });
    return value;
  } catch (error) {
    await updateSessionArtifact(pipeline, sessionId, (artifact) => {
      const call = artifact.llmCalls.find((entry) => entry.id === definition.callId);
      if (!call) {
        return;
      }

      const completedAt = new Date().toISOString();
      call.status = "failed";
      call.completedAt = completedAt;
      call.durationMs = Date.parse(completedAt) - Date.parse(call.startedAt);
      call.error = serializeJsonValue(error);
    });
    throw error;
  }
}

async function updateSessionArtifact(
  pipeline: string,
  sessionId: string,
  mutate: (artifact: LlmSessionArtifact) => void,
) {
  const queueKey = `${pipeline}:${sessionId}`;
  const previous = sessionWriteQueues.get(queueKey) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      try {
        const artifactPath = getLlmSessionArtifactPath(pipeline, sessionId);
        await mkdir(path.dirname(artifactPath), { recursive: true });

        const artifact = existsSync(artifactPath)
          ? parseSessionArtifact(await readFile(artifactPath, "utf8"), pipeline, sessionId)
          : createEmptySessionArtifact(pipeline, sessionId);

        mutate(artifact);
        await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
      } catch (error) {
        console.error("Failed to write LLM log artifact.", error);
      }
    });

  sessionWriteQueues.set(queueKey, next);
  await next;
}

function createEmptySessionArtifact(
  pipeline: string,
  sessionId: string,
): LlmSessionArtifact {
  return {
    version: 1,
    sessionId,
    pipeline,
    status: "running",
    startedAt: new Date().toISOString(),
    events: [],
    llmCalls: [],
  };
}

function parseSessionArtifact(
  raw: string,
  pipeline: string,
  sessionId: string,
): LlmSessionArtifact {
  const parsed = JSON.parse(raw) as Partial<LlmSessionArtifact>;
  return {
    version: 1,
    sessionId,
    pipeline,
    status: parsed.status === "completed" || parsed.status === "failed" ? parsed.status : "running",
    startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : new Date().toISOString(),
    completedAt: typeof parsed.completedAt === "string" ? parsed.completedAt : undefined,
    metadata: isJsonValue(parsed.metadata) ? parsed.metadata : undefined,
    result: isJsonValue(parsed.result) ? parsed.result : undefined,
    error: isJsonValue(parsed.error) ? parsed.error : undefined,
    events: Array.isArray(parsed.events) ? parsed.events : [],
    llmCalls: Array.isArray(parsed.llmCalls) ? parsed.llmCalls : [],
  };
}

export function getLlmLogsDirPath() {
  const cwd = process.cwd();
  const projectRoot = path.basename(cwd) === "app" ? path.dirname(cwd) : cwd;
  return path.join(projectRoot, "llm_logs");
}

export function getLlmSessionArtifactPath(pipeline: string, sessionId: string) {
  return path.join(getLlmLogsDirPath(), sanitizePathSegment(pipeline), `${sanitizePathSegment(sessionId)}.json`);
}

function sanitizePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_") || "unknown";
}

function serializeJsonValue(value: unknown, depth = 0, seen = new WeakSet<object>()): JsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack ?? null,
    };
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return {
      type: "Buffer",
      byteLength: value.byteLength,
    };
  }
  if (value instanceof ArrayBuffer) {
    return {
      type: "ArrayBuffer",
      byteLength: value.byteLength,
    };
  }
  if (ArrayBuffer.isView(value)) {
    return {
      type: value.constructor.name,
      byteLength: value.byteLength,
    };
  }
  if (typeof File !== "undefined" && value instanceof File) {
    return {
      type: "File",
      name: value.name,
      size: value.size,
      mimeType: value.type,
    };
  }
  if (Array.isArray(value)) {
    if (depth >= 6) {
      return value.map(() => "[MaxDepth]");
    }
    return value.map((entry) => serializeJsonValue(entry, depth + 1, seen) ?? null);
  }
  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }
    if (depth >= 6) {
      return "[MaxDepth]";
    }

    seen.add(value);
    const record = value as Record<string, unknown>;
    const serializedEntries = Object.entries(record)
      .map(([key, entry]) => {
        const serialized = serializeJsonValue(entry, depth + 1, seen);
        return serialized === undefined ? null : [key, serialized] as const;
      })
      .filter((entry): entry is readonly [string, JsonValue] => Boolean(entry));
    seen.delete(value);
    return Object.fromEntries(serializedEntries);
  }

  return String(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  return value !== undefined;
}
