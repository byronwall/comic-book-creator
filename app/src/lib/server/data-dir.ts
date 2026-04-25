import { existsSync } from "node:fs";
import path from "node:path";

export function resolveAppDataDir() {
  const configuredDataDir = process.env.APP_DATA_DIR?.trim();
  if (configuredDataDir) {
    return path.resolve(configuredDataDir);
  }

  const cwd = process.cwd();
  const candidates = [path.join(cwd, "data"), path.join(cwd, "app", "data")];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}
