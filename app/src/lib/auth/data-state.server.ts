import { readFile } from "node:fs/promises";
import path from "node:path";
import { resolveAppDataDir } from "../server/data-dir.ts";
import type { DataState } from "./types.ts";

export async function readDataState(dataDir = resolveAppDataDir()): Promise<DataState> {
  let value: unknown;
  try {
    value = JSON.parse(await readFile(path.join(dataDir, "data-state.json"), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("Account storage is not initialized: data-state.json is missing.");
    }
    throw error;
  }
  if (!value || typeof value !== "object") throw new Error("Data state is invalid.");
  const state = value as DataState;
  if (state.schemaVersion !== 2 || !(state.legacyUserId === null || (typeof state.legacyUserId === "string" && state.legacyUserId.length > 0))) {
    throw new Error("Account storage state is invalid.");
  }
  return state;
}
