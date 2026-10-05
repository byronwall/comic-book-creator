import { query } from "@solidjs/router";

export const getSpatialMapData = query(async () => {
  "use server";
  const { currentRequest, requireToolOwner } = await import("~/lib/auth/request.server");
  const { readSpatialMapDataFromDisk } = await import("./data.server");
  await requireToolOwner(currentRequest());
  return readSpatialMapDataFromDisk();
}, "spatial-map-data");
