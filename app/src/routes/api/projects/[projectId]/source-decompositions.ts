import type { APIEvent } from "@solidjs/start/server";
import { startSourceDecompositionRun } from "~/lib/source-decomposition/service";

export async function POST(event: APIEvent) {
  try {
    const formData = await event.request.formData();
    const sourceText = String(formData.get("sourceText") ?? "");
    const selectedNodeId = formData.get("selectedNodeId");
    const images = formData
      .getAll("images")
      .filter((value): value is File => value instanceof File);
    const started = await startSourceDecompositionRun({
      projectId: event.params.projectId,
      input: {
        sourceText,
        selectedNodeId: typeof selectedNodeId === "string" && selectedNodeId ? selectedNodeId : null,
        images,
      },
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
        error: error instanceof Error ? error.message : "Failed to start source decomposition.",
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
