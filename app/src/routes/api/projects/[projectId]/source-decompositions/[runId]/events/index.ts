import { ownerEventStream } from "~/lib/auth/owner-stream.server";
import type { APIEvent } from "@solidjs/start/server";
import {
  getSourceDecompositionRunSnapshot,
  subscribeSourceDecompositionRun,
} from "~/lib/source-decomposition/run-registry";
import { encodeSourceDecompositionEvent } from "~/lib/source-decomposition/service";
import type { SourceDecompositionRunEvent } from "~/lib/source-decomposition/types";

export async function GET(event: APIEvent) {
  const snapshot = getSourceDecompositionRunSnapshot(event.params.runId);
  if (!snapshot || snapshot.projectId !== event.params.projectId) {
    return new Response(JSON.stringify({ error: "Run not found." }), {
      status: 404,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  }

  const stream = ownerEventStream<SourceDecompositionRunEvent>(event.request, {
    type: snapshot.status === "completed" ? "complete" : snapshot.status === "failed" ? "failed" : "snapshot",
    snapshot,
  }, (send) => subscribeSourceDecompositionRun(event.params.runId, send), encodeSourceDecompositionEvent);

  return new Response(stream, {
    headers: {
      "Cache-Control": "private, no-store",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}
