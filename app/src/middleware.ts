import { createMiddleware } from "@solidjs/start/middleware";
import { setHeader } from "vinxi/http";
import { appOrigin, requireToolOwner, requireUser, returnDestination } from "~/lib/auth/request.server";
import { appPath } from "~/lib/router/app-path";

function routePath(request: Request) {
  const base = appPath("/").replace(/\/$/, "");
  return decodeURIComponent(new URL(request.url).pathname).slice(base.length) || "/";
}
function isPrivate(path: string) {
  return path === "/books" || path.startsWith("/books/") || path.startsWith("/api/") || path.startsWith("/_server");
}
export default createMiddleware({
  async onRequest(event) {
    const path = routePath(event.request);
    if (path === "/books" || path.startsWith("/books/")) {
      try { await requireUser(event.request); }
      catch (error) {
        if (error instanceof Response && error.status === 401) {
          const url = new URL(appPath("/sign-in"), appOrigin());
          url.searchParams.set("returnTo", returnDestination(new URL(event.request.url).pathname));
          return Response.redirect(url.href, 302);
        }
        if (error instanceof Response) return error;
        return new Response("Data storage is unavailable.", { status: 503 });
      }
    }
    if (path === "/api/projects" || path.startsWith("/api/projects/") || (path === "/api/spatial-map" || path.startsWith("/api/spatial-map/"))) {
      try { await requireToolOwner(event.request, !["GET", "HEAD"].includes(event.request.method)); }
      catch (error) {
        if (error instanceof Response) return error;
        return new Response("Data storage is unavailable.", { status: 503 });
      }
    }
  },
  onBeforeResponse(event) {
    const path = routePath(event.request);
    if (isPrivate(path)) {
      setHeader(event.nativeEvent, "cache-control", "private, no-store");
      setHeader(event.nativeEvent, "x-robots-tag", "noindex, nofollow");
      setHeader(event.nativeEvent, "vary", "Cookie");
    }
  },
});
