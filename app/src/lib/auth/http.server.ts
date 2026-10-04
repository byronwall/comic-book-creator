export function fail(status: number, message: string): never {
  throw new Response(message, { status, headers: { "cache-control": "private, no-store" } });
}

export function privateJson(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" },
  });
}

export async function apiResponse(work: () => Promise<Response>) {
  try { return await work(); }
  catch (error) {
    if (error instanceof Response) return error;
    console.error("Account request failed.", error instanceof Error ? error.message : "Unknown error");
    return new Response("The data store is unavailable. Try again later.", {
      status: 503, headers: { "cache-control": "private, no-store" },
    });
  }
}
