import type { APIEvent } from "@solidjs/start/server";
import { exportProjectArchiveOnDisk } from "~/lib/projects/archive.server";

export async function GET(event: APIEvent) {
  try {
    const archive = await exportProjectArchiveOnDisk(event.params.projectId);
    return new Response(new Uint8Array(archive.data), {
      headers: {
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="${archive.filename}"`,
        "content-length": String(archive.data.byteLength),
        "content-type": "application/zip",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed.";
    return new Response(message, { status: message === "Project not found." ? 404 : 500 });
  }
}
