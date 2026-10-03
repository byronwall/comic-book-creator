import { existsSync } from "node:fs";
import { stdin, stdout } from "node:process";
import path from "node:path";
import { initializeEmptyData, preflightLegacyData, migrateLegacyData, verifyData } from "../../src/lib/migrations/legacy-ownership.server.ts";

function args(argv: string[]) {
  const command = argv[0];
  const dataIndex = argv.indexOf("--data-dir");
  const dataDir = dataIndex >= 0 ? argv[dataIndex + 1] : undefined;
  if (!dataDir || !path.isAbsolute(dataDir)) throw new Error("Pass an explicit absolute --data-dir path.");
  return { command, dataDir: path.resolve(dataDir), dryRun: argv.includes("--dry-run"), apply: argv.includes("--apply") };
}

async function hidden(prompt: string) {
  if (!stdin.isTTY || !stdin.setRawMode) throw new Error("Apply requires an interactive terminal for hidden password entry.");
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise<string>((resolve, reject) => {
    let value = "";
    const finish = (error?: Error) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      if (error) reject(error);
      else { stdout.write("\n"); resolve(value); }
    };
    const onData = (chunk: Buffer | string) => {
      for (const char of String(chunk)) {
        if (char === "\u0003") { finish(new Error("Cancelled.")); return; }
        if (char === "\r" || char === "\n") { finish(); return; }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const { command, dataDir, dryRun, apply } = args(process.argv.slice(2));
  if (command === "migrate") {
    const email = process.env.LEGACY_USER_EMAIL?.trim();
    if (!email) throw new Error("Set LEGACY_USER_EMAIL before migration.");
    if (dryRun === apply) throw new Error("Choose exactly one of --dry-run or --apply.");
    const preflight = await preflightLegacyData(dataDir, email);
    const inspected = preflight.inspected;
    console.log(`Target: ${inspected.root}`);
    console.log(`Legacy account: ${email.toLowerCase()}`);
    console.log(`Books: ${inspected.records.length}; files: ${inspected.files.length}`);
    for (const file of inspected.files) console.log(`  ${inspected.records.some((record) => record.relative === file) ? "book" : "preserve"} ${file}`);
    if (dryRun) { console.log("Dry run passed. No files changed."); return; }
    const journal = path.join(dataDir, "migrations", "legacy-ownership", "journal.json");
    let password: string | undefined;
    if (!existsSync(journal) && !preflight.completed) {
      password = await hidden("New account password: ");
      const confirm = await hidden("Confirm password: ");
      if (password !== confirm) throw new Error("Passwords do not match.");
    }
    console.log(JSON.stringify(await migrateLegacyData({ dataDir, email, password }), null, 2));
    return;
  }
  if (command === "verify") {
    console.log(JSON.stringify(await verifyData(dataDir, process.env.LEGACY_USER_EMAIL ?? ""), null, 2));
    return;
  }
  if (command === "init-empty") {
    console.log(JSON.stringify(await initializeEmptyData(dataDir), null, 2));
    return;
  }
  throw new Error("Use migrate, verify, or init-empty.");
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
