import type { APIEvent } from "@solidjs/start/server";
import { getSourceDecompositionRunSnapshot } from "~/lib/source-decomposition/run-registry";

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

  return new Response(JSON.stringify(snapshot), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
