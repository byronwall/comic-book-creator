import type { APIEvent } from "@solidjs/start/server";
import type { AddNodesRunStartRequest } from "~/lib/add-nodes/types";
import { startAddNodesRun } from "~/lib/add-nodes/service";

export async function POST(event: APIEvent) {
  try {
    const input = (await event.request.json()) as AddNodesRunStartRequest;
    const started = await startAddNodesRun({
      projectId: event.params.projectId,
      input,
    });

    return new Response(JSON.stringify(started), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to start add-nodes run.",
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
