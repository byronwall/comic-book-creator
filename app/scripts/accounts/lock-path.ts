import path from "node:path";
import { realpath } from "node:fs/promises";

const root = process.env.APP_DATA_DIR;
if (!root || !path.isAbsolute(root)) throw new Error("Set APP_DATA_DIR to an absolute path before container startup.");
console.log(path.join(await realpath(root), ".writer.lock"));
