import path from "node:path";
import { realpath } from "node:fs/promises";
import { backupLocation, requireAbsolute, sha256 } from "../../src/lib/migrations/legacy-ownership-files.ts";

const root = process.env.APP_DATA_DIR;
if (!root) throw new Error("Set APP_DATA_DIR before container startup.");
requireAbsolute(root);
const parent = await backupLocation(root, process.env.MIGRATION_BACKUP_DIR);
// Resolve aliases so two containers with the same mounts use the same lock.
const source = await realpath(root);
console.log(path.join(parent, `.writer-${sha256(source)}.lock`));
