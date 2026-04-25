import type { APIEvent } from "@solidjs/start/server";
import { startNodeImageGenerationRun } from "~/lib/node-images/generation.server";
import type { NodeImageGenerationStartRequest } from "~/lib/node-images/types";

export async function POST(event: APIEvent) {
  try {
    const input = (await event.request.json()) as NodeImageGenerationStartRequest;
    const started = await startNodeImageGenerationRun({
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
        error: error instanceof Error ? error.message : "Failed to start node image generation.",
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
