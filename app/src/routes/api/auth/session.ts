import type { APIEvent } from "@solidjs/start/server";
import { apiResponse, privateJson } from "~/lib/auth/http.server";
import { readSession } from "~/lib/auth/sessions.server";

export function GET(event: APIEvent) {
  return apiResponse(async () => privateJson((await readSession(event.request))?.account ?? null));
}
