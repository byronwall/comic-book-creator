import type { APIEvent } from "@solidjs/start/server";
import { readSpatialMapDataFromDisk } from "~/lib/spatial-map/data.server";

export async function GET(_event: APIEvent) {
  const data = await readSpatialMapDataFromDisk();

  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
