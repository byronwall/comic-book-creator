import { mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { writeFileAtomic } from "../server/atomic-file.ts";
import { syncPath } from "./legacy-ownership-files.ts";

// Keep interrupted temporary writes in the migration directory. Source files
// remain either the recorded source or target until the atomic rename.
export async function writeMigrationFile(root: string, relative: string, contents: string) {
  const stageDir = path.join(root, "migrations", "legacy-ownership", "stage");
  const target = path.join(root, relative);
  await mkdir(stageDir, { recursive: true });
  await mkdir(path.dirname(target), { recursive: true });
  const stage = path.join(stageDir, "next");
  await writeFileAtomic(stage, contents);
  await syncPath(stageDir);
  await rename(stage, target);
  // Sync the new directory entries before the next migration commit.
  let dir = path.dirname(target);
  while (dir !== path.dirname(root)) {
    await syncPath(dir);
    if (dir === root) break;
    dir = path.dirname(dir);
  }
  await syncPath(stageDir);
}
