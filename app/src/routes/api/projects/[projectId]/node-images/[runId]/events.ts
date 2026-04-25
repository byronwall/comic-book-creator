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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (runEvent: NodeImageGenerationRunEvent) => {
        controller.enqueue(encoder.encode(encodeNodeImageGenerationEvent(runEvent)));
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

      const unsubscribe = subscribeNodeImageGenerationRun(event.params.runId, send);
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
