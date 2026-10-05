import path from "node:path";
import { initializeEmptyData } from "../../src/lib/auth/storage.server.ts";

try {
  const args = process.argv.slice(2);
  const index = args.indexOf("--data-dir");
  const dataDir = index >= 0 ? args[index + 1] : undefined;
  if (args[0] !== "init-empty" || !dataDir || !path.isAbsolute(dataDir)) {
    throw new Error("Use init-empty --data-dir /absolute/path/to/new-data.");
  }
  console.log(JSON.stringify(await initializeEmptyData(dataDir), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
