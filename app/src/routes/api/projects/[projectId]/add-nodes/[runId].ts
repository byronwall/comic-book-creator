import type { APIEvent } from "@solidjs/start/server";
import {
  getAddNodesRunSnapshot,
} from "~/lib/add-nodes/run-registry";
import { submitAddNodesRunAnswers } from "~/lib/add-nodes/service";
import type { AddNodesRunAnswerRequest } from "~/lib/add-nodes/types";

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

  return new Response(JSON.stringify(snapshot), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function POST(event: APIEvent) {
  try {
    const input = (await event.request.json()) as AddNodesRunAnswerRequest;
    const snapshot = await submitAddNodesRunAnswers({
      projectId: event.params.projectId,
      runId: event.params.runId,
      input,
    });

    return new Response(JSON.stringify(snapshot), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to submit add-nodes answers.",
      }),
      {
        status: 400,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
      },
    );
  }
}
