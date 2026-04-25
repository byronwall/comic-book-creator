import type { APIEvent } from "@solidjs/start/server";
import { getContextNoteConversionRunSnapshot } from "~/lib/context-note-conversion/run-registry";
import { submitContextNoteConversionAnswers } from "~/lib/context-note-conversion/service";
import type { ContextNoteConversionRunAnswerRequest } from "~/lib/context-note-conversion/types";

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

  return new Response(JSON.stringify(snapshot), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function POST(event: APIEvent) {
  try {
    const input = (await event.request.json()) as ContextNoteConversionRunAnswerRequest;
    const snapshot = await submitContextNoteConversionAnswers({
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
        error: error instanceof Error ? error.message : "Failed to submit note conversion answers.",
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
