export function appPath(path: string) {
  const base = (import.meta.env.SERVER_BASE_URL || "").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}` || "/";
}
