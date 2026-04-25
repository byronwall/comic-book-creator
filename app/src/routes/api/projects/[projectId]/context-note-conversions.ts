import type { APIEvent } from "@solidjs/start/server";
import type { ContextNoteConversionRunStartRequest } from "~/lib/context-note-conversion/types";
import { startContextNoteConversionRun } from "~/lib/context-note-conversion/service";

export async function POST(event: APIEvent) {
  try {
    const input = (await event.request.json()) as ContextNoteConversionRunStartRequest;
    const result = await startContextNoteConversionRun({
      projectId: event.params.projectId,
      input,
    });

    return new Response(JSON.stringify(result), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to start note conversion.",
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
