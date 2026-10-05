import { ownerEventStream } from "~/lib/auth/owner-stream.server";
import type { APIEvent } from "@solidjs/start/server";
import {
  getContextNoteConversionRunSnapshot,
  subscribeContextNoteConversionRun,
} from "~/lib/context-note-conversion/run-registry";
import { encodeContextNoteConversionEvent } from "~/lib/context-note-conversion/service";
import type { ContextNoteConversionRunEvent } from "~/lib/context-note-conversion/types";

export async function GET(event: APIEvent) {
  const snapshot = getContextNoteConversionRunSnapshot(event.params.runId);
  if (!snapshot || snapshot.projectId !== event.params.projectId) {
    return new Response(JSON.stringify({ error: "Run not found." }), {
      status: 404,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  }

  const stream = ownerEventStream<ContextNoteConversionRunEvent>(event.request, {
    type: snapshot.status === "completed" ? "complete" : snapshot.status === "failed" ? "failed" : "snapshot",
    snapshot,
  }, (send) => subscribeContextNoteConversionRun(event.params.runId, send), encodeContextNoteConversionEvent);

  return new Response(stream, {
    headers: {
      "Cache-Control": "private, no-store",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}
