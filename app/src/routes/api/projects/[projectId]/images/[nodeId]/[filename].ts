import { readFile } from "node:fs/promises";
import type { APIEvent } from "@solidjs/start/server";
import {
  getProjectNodeImageFilePath,
  readProjectByIdFromDisk,
} from "~/lib/projects/data.server";

export async function GET(event: APIEvent) {
  const project = await readProjectByIdFromDisk(event.params.projectId);
  const node = project?.spatialMap.nodes.find((item) => item.id === event.params.nodeId);
  const image = node?.images?.find((item) => item.filename === event.params.filename);

  if (!project || !node || !image) {
    return new Response("Not found", { status: 404 });
  }

  const imageBuffer = await readFile(
    getProjectNodeImageFilePath({
      projectId: event.params.projectId,
      nodeId: event.params.nodeId,
      filename: event.params.filename,
    }),
  );

  return new Response(new Uint8Array(imageBuffer), {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": String(imageBuffer.byteLength),
      "content-type": image.mimeType,
    },
  });
}
