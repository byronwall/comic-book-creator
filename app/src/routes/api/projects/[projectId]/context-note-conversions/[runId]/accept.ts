import type { APIEvent } from "@solidjs/start/server";
import { acceptContextNoteConversionSelection } from "~/lib/context-note-conversion/service";
import type { ContextNoteConversionRunAcceptRequest } from "~/lib/context-note-conversion/types";

export async function POST(event: APIEvent) {
  try {
    const input = (await event.request.json()) as ContextNoteConversionRunAcceptRequest;
    const snapshot = await acceptContextNoteConversionSelection({
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
        error: error instanceof Error ? error.message : "Failed to accept note conversion selection.",
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
