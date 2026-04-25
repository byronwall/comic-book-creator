import type { APIEvent } from "@solidjs/start/server";
import { readProjectByIdFromDisk } from "~/lib/projects/data.server";

export async function GET(event: APIEvent) {
  const project = await readProjectByIdFromDisk(event.params.projectId);

  if (!project) {
    return new Response("Not found", {
      status: 404,
    });
  }

  return new Response(JSON.stringify(project), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
