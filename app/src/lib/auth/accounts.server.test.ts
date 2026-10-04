import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initializeEmptyData } from "~/lib/migrations/legacy-ownership.server";
import { addUser, readUserStore } from "./users.server";
import { hashPassword } from "./password.server";
import { legacyEventStream } from "./legacy-stream.server";
import { registerAccount } from "./register.server";
import { authenticate } from "./login.server";
import { issueSession, readSession, revokeSession, SESSION_COOKIE } from "./sessions.server";
import { requireLegacyUser, requireMutationUser, returnDestination } from "./request.server";

let root: string;
const originalDir = process.env.APP_DATA_DIR;
const originalOrigin = process.env.APP_ORIGIN;
const password = "a disposable test passphrase";
beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "comic-auth-"));
  process.env.APP_DATA_DIR = root;
  process.env.APP_ORIGIN = "http://comic.test";
  await initializeEmptyData(root);
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
  if (originalDir === undefined) delete process.env.APP_DATA_DIR; else process.env.APP_DATA_DIR = originalDir;
  if (originalOrigin === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = originalOrigin;
});
function request(token = "", origin = "http://comic.test", userId = "") {
  return new Request("http://comic.test/api/comic-books", {
    method: "POST", headers: { cookie: `${SESSION_COOKIE}=${token}`, origin, "x-comic-user": userId },
  });
}

describe("disk-backed account boundaries", () => {
  it("authenticates, rotates, persists, expires, and revokes opaque sessions", async () => {
    const user = await addUser({ username: "Legacy", passwordHash: await hashPassword(password) });
    expect((await authenticate(" LEGACY ", password))?.id).toBe(user.id);
    expect(await authenticate(user.username, "a wrong test passphrase")).toBeNull();
    const first = await issueSession(user.id, request());
    const file = path.join(root, "auth/sessions", `${createHash("sha256").update(first.token).digest("hex")}.json`);
    expect(await readFile(file, "utf8")).not.toContain(first.token);
    expect((await readSession(request(first.token)))?.account).toEqual({ id: user.id, username: user.username });
    const second = await issueSession(user.id, request(first.token));
    expect(await readSession(request(first.token))).toBeNull();
    await revokeSession(request(second.token));
    expect(await readSession(request(second.token))).toBeNull();
    await writeFile(file, JSON.stringify({ ...first.session, expiresAt: "2000-01-01T00:00:00.000Z" }));
    expect(await readSession(request(first.token))).toBeNull();
  });

  it("rejects foreign origins, old account contexts, nonlegacy tools, and unsafe return paths", async () => {
    const user = await addUser({ username: "user-a", passwordHash: await hashPassword(password) });
    const { token } = await issueSession(user.id, request());
    await expect(requireMutationUser(request(token, "http://evil.test", user.id))).rejects.toMatchObject({ status: 403 });
    await expect(requireMutationUser(request(token, "", user.id))).rejects.toMatchObject({ status: 403 });
    await expect(requireMutationUser(request(token, "http://comic.test", "other"))).rejects.toMatchObject({ status: 409 });
    await expect(requireMutationUser(request(token, "http://comic.test", user.id))).resolves.toMatchObject({ id: user.id });
    await expect(requireLegacyUser(request(token))).rejects.toMatchObject({ status: 404 });
    expect(returnDestination("//evil.test/books")).toBe("/books");
    expect(returnDestination("/books/../../sign-in")).toBe("/books");
    expect(returnDestination("/books/one")).toBe("/books/one");
    await rm(path.join(root, "data-state.json"));
    await expect(readSession(request(token))).rejects.toMatchObject({ status: 503 });
  });

  it("closes a legacy event stream before sending more data after logout", async () => {
    const user = await addUser({ username: "legacy", passwordHash: await hashPassword(password) });
    const stateFile = path.join(root, "data-state.json");
    const state = JSON.parse(await readFile(stateFile, "utf8"));
    await writeFile(stateFile, JSON.stringify({ ...state, legacyUserId: user.id }));
    const { token } = await issueSession(user.id, request());
    let send: (event: { type: string }) => void = () => {};
    let unsubscribed = false;
    const stream = legacyEventStream(request(token), { type: "snapshot" }, (listener) => {
      send = listener;
      return () => { unsubscribed = true; };
    }, (event) => JSON.stringify(event));
    const reader = stream.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toContain("snapshot");
    await revokeSession(request(token));
    send({ type: "update" });
    expect((await reader.read()).done).toBe(true);
    expect(unsubscribed).toBe(true);
  });


  it("keeps one account when duplicate usernames race and rejects invalid registration", async () => {
    const passwordHash = await hashPassword(password);
    const results = await Promise.allSettled([
      addUser({ username: "Person", passwordHash }),
      addUser({ username: " person ", passwordHash }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((await readUserStore()).users).toHaveLength(1);
    await expect(registerAccount("PERSON", password)).rejects.toMatchObject({ status: 409 });
    await expect(registerAccount("bad name", password)).rejects.toMatchObject({ status: 400 });
    await expect(registerAccount("new-user", "too short")).rejects.toMatchObject({ status: 400 });
    await expect(registerAccount("new-user", "x".repeat(129))).rejects.toMatchObject({ status: 400 });
    expect((await readUserStore()).users).toHaveLength(1);
  });

});
