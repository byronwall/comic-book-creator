import type { APIEvent } from "@solidjs/start/server";
import { readProjectSummariesFromDisk } from "~/lib/projects/data.server";

export async function GET(_event: APIEvent) {
  const projects = await readProjectSummariesFromDisk();

  return new Response(JSON.stringify(projects), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
