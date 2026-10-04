import path from "node:path";
import { pathToFileURL } from "node:url";
import { prepareStartupStorage } from "../../src/lib/migrations/startup.server.ts";

try {
  const dataDir = process.env.APP_DATA_DIR;
  if (!dataDir) throw new Error("Set APP_DATA_DIR to the existing absolute data path before startup.");
  await prepareStartupStorage({ dataDir, email: process.env.LEGACY_USER_EMAIL, backupDir: process.env.MIGRATION_BACKUP_DIR });
  await import(pathToFileURL(path.resolve(".output/server/index.mjs")).href);
} catch (error) {
  console.error(`Startup stopped: ${error instanceof Error ? error.message : "Storage preparation failed."}`);
  process.exitCode = 1;
}
