import type { APIEvent } from "@solidjs/start/server";

export function GET(_event: APIEvent) {
  return new Response("Not found", { status: 404, headers: { "cache-control": "private, no-store" } });
}

export function PUT(_event: APIEvent) {
  return new Response("Not found", { status: 404, headers: { "cache-control": "private, no-store" } });
}
