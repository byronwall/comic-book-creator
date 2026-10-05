export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

/** Use one timezone on both server and client for stable hydration. */
export function formatDate(value: string | null) {
  if (!value) return "No activity recorded";
  return `${value.slice(0, 10)} ${value.slice(11, 16)} UTC`;
}
