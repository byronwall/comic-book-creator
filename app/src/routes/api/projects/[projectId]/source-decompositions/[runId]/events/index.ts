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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (runEvent: SourceDecompositionRunEvent) => {
        controller.enqueue(encoder.encode(encodeSourceDecompositionEvent(runEvent)));
        if (runEvent.type === "complete" || runEvent.type === "failed") {
          controller.close();
        }
      };

      send({
        type:
          snapshot.status === "completed"
            ? "complete"
            : snapshot.status === "failed"
              ? "failed"
              : "snapshot",
        snapshot,
      });

      if (snapshot.status === "completed" || snapshot.status === "failed") {
        return;
      }

      const unsubscribe = subscribeSourceDecompositionRun(event.params.runId, send);
      event.request.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}
