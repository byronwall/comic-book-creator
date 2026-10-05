import { ownerEventStream } from "~/lib/auth/owner-stream.server";
import type { APIEvent } from "@solidjs/start/server";
import {
  getNodeImageGenerationRunSnapshot,
  subscribeNodeImageGenerationRun,
} from "~/lib/node-images/run-registry";
import { encodeNodeImageGenerationEvent } from "~/lib/node-images/run-snapshot";
import type { NodeImageGenerationRunEvent } from "~/lib/node-images/types";

export async function GET(event: APIEvent) {
  const snapshot = getNodeImageGenerationRunSnapshot(event.params.runId);
  if (!snapshot || snapshot.projectId !== event.params.projectId) {
    return new Response(JSON.stringify({ error: "Run not found." }), {
      status: 404,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  }

  const stream = ownerEventStream<NodeImageGenerationRunEvent>(event.request, {
    type: snapshot.status === "completed" ? "complete" : snapshot.status === "failed" ? "failed" : "snapshot",
    snapshot,
  }, (send) => subscribeNodeImageGenerationRun(event.params.runId, send), encodeNodeImageGenerationEvent);

  return new Response(stream, {
    headers: {
      "Cache-Control": "private, no-store",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}
