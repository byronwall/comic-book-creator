import { query } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import type { SpatialMapData } from "~/lib/spatial-map/types";
import { parseSpatialMapData } from "~/lib/spatial-map/validate";

async function fetchSpatialMapData(): Promise<SpatialMapData> {
  const requestEvent = getRequestEvent();
  const requestUrl = requestEvent?.request.url;
  const url = requestUrl
    ? new URL("/api/spatial-map", requestUrl)
    : new URL("/api/spatial-map", window.location.origin);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load spatial map data: ${response.status}`);
  }

  return parseSpatialMapData(await response.json());
}

export const getSpatialMapData = query(
  async () => fetchSpatialMapData(),
  "spatial-map-data",
);
