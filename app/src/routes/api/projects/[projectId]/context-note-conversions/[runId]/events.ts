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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (runEvent: ContextNoteConversionRunEvent) => {
        controller.enqueue(encoder.encode(encodeContextNoteConversionEvent(runEvent)));
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

      const unsubscribe = subscribeContextNoteConversionRun(event.params.runId, send);
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
