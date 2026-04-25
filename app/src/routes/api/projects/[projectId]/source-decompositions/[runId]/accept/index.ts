import type { APIEvent } from "@solidjs/start/server";
import { acceptSourceDecompositionSelection } from "~/lib/source-decomposition/service";
import type { SourceDecompositionRunAcceptRequest } from "~/lib/source-decomposition/types";

export async function POST(event: APIEvent) {
  try {
    const input = (await event.request.json()) as SourceDecompositionRunAcceptRequest;
    const snapshot = await acceptSourceDecompositionSelection({
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
        error: error instanceof Error ? error.message : "Failed to accept source decomposition selection.",
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
