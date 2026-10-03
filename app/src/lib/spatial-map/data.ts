import { query } from "@solidjs/router";

export const getSpatialMapData = query(async () => {
  "use server";
  const { currentRequest, requireLegacyUser } = await import("~/lib/auth/request.server");
  const { readSpatialMapDataFromDisk } = await import("./data.server");
  await requireLegacyUser(currentRequest());
  return readSpatialMapDataFromDisk();
}, "spatial-map-data");
