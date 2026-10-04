import { legacyEventStream } from "~/lib/auth/legacy-stream.server";
import type { APIEvent } from "@solidjs/start/server";
import {
  getAddNodesRunSnapshot,
  subscribeAddNodesRun,
} from "~/lib/add-nodes/run-registry";
import { encodeAddNodesEvent } from "~/lib/add-nodes/service";
import type { AddNodesRunEvent } from "~/lib/add-nodes/types";

export async function GET(event: APIEvent) {
  const snapshot = getAddNodesRunSnapshot(event.params.runId);
  if (!snapshot || snapshot.projectId !== event.params.projectId) {
    return new Response(JSON.stringify({ error: "Run not found." }), {
      status: 404,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  }

  const stream = legacyEventStream<AddNodesRunEvent>(event.request, {
    type: snapshot.status === "completed" ? "complete" : snapshot.status === "failed" ? "failed" : "snapshot",
    snapshot,
  }, (send) => subscribeAddNodesRun(event.params.runId, send), encodeAddNodesEvent);

  return new Response(stream, {
    headers: {
      "Cache-Control": "private, no-store",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}
