import { createEffect, createSignal, onCleanup, onMount, untrack } from "solid-js";
import { useBeforeLeave } from "@solidjs/router";
import { appPath } from "~/lib/router/app-path";
import { watchAccountTabs } from "~/lib/auth/account-events";
import type { ComicBook } from "~/lib/comics/types";
import { createComicDraftQueue, DraftSaveError } from "./comic-draft-queue";
import type { DraftPause } from "./comic-draft-queue";

export function useComicDraft(options: {
  initialBook: ComicBook;
  accountId: string;
  book: () => ComicBook;
  setBook: (book: ComicBook) => void;
  onReload: (book: ComicBook) => void;
  uploadsBusy: () => boolean;
  cancelUploads: () => Promise<void>;
}) {
  const [saveState, setSaveState] = createSignal<"saved" | "saving" | "error">("saved");
  const [pause, setPause] = createSignal<DraftPause>();
  const [accountChanged, setAccountChanged] = createSignal(false);
  const [leaveAction, setLeaveAction] = createSignal<(() => void) | undefined>();
  let lastSavedKey = contentKey(options.initialBook);
  let firstBookEffect = true;
  let ignoreNextBookEffect = false;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let leaveAttempt = 0;
  const queue = createComicDraftQueue({
    revision: options.initialBook.revision,
    save: async (snapshot, revision) => {
      const response = await fetch(appPath(`/api/comic-books/${snapshot.id}`), {
        method: "PUT",
        headers: { "content-type": "application/json", "x-comic-user": options.accountId },
        body: JSON.stringify({ ...snapshot, revision }),
      });
      if (!response.ok) {
        const detail = await response.text();
        const reason: DraftPause = response.status === 401 ? "expired"
          : response.status === 409 && detail.toLowerCase().includes("account") ? "account"
            : response.status === 409 ? "conflict" : "network";
        throw new DraftSaveError(reason, detail);
      }
      return response.json() as Promise<ComicBook>;
    },
    onSaved: (snapshot) => {
      lastSavedKey = contentKey(snapshot);
      if (contentKey(untrack(options.book)) === lastSavedKey) setSaveState("saved");
    },
    onPause: (reason) => {
      setPause(reason);
      setSaveState("error");
      if (reason === "account") setAccountChanged(true);
    },
    onState: (saving) => { if (saving) setSaveState("saving"); },
  });

  createEffect(() => {
    const nextBook = options.book();
    if (firstBookEffect) { firstBookEffect = false; return; }
    if (ignoreNextBookEffect) { ignoreNextBookEffect = false; return; }
    setSaveState("saving");
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => queue.schedule(nextBook), 350);
  });

  onMount(() => {
    let checking = false;
    const checkAccount = async () => {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch(appPath("/api/auth/session"), { cache: "no-store" });
        if (!response.ok) throw new Error("Session check failed");
        const session = await response.json() as { id?: string } | null;
        if (!session) { setPause("expired"); queue.pause("expired"); return; }
        if (session.id !== options.accountId) {
          setAccountChanged(true);
          setPause("account");
          queue.pause("account");
        }
      } catch { setPause("network"); queue.pause("network"); }
      finally { checking = false; }
    };
    const refreshAccount = () => { void checkAccount(); };
    const warnBeforeClose = (event: BeforeUnloadEvent) => {
      if (contentKey(options.book()) === lastSavedKey && !queue.hasPending && !options.uploadsBusy()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const stopWatching = watchAccountTabs(refreshAccount);
    window.addEventListener("beforeunload", warnBeforeClose);
    void checkAccount();
    onCleanup(() => {
      stopWatching();
      window.removeEventListener("beforeunload", warnBeforeClose);
    });
  });

  onCleanup(() => {
    if (saveTimer) clearTimeout(saveTimer);
    queue.dispose();
  });

  async function checkAndResume() {
    try {
      const sessionResponse = await fetch(appPath("/api/auth/session"), { cache: "no-store" });
      if (!sessionResponse.ok) throw new Error("Could not check the account.");
      const session = await sessionResponse.json() as { id?: string } | null;
      if (session?.id !== options.accountId) {
        setAccountChanged(true);
        setPause(session ? "account" : "expired");
        queue.pause(session ? "account" : "expired");
        return;
      }
      const bookResponse = await fetch(appPath(`/api/comic-books/${options.book().id}`), { cache: "no-store" });
      if (!bookResponse.ok) throw new Error("Could not check the saved book.");
      const currentBook = await bookResponse.json() as ComicBook;
      if (currentBook.revision !== queue.revision) { setPause("conflict"); return; }
      setAccountChanged(false);
      setPause(undefined);
      queue.resume(currentBook.revision);
    } catch { setPause("network"); }
  }

  function reloadSavedBook() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = undefined; }
    queue.pause("conflict");
    void queue.waitForFlight()
      .then(() => fetch(appPath(`/api/comic-books/${options.book().id}`), { headers: { "x-comic-user": options.accountId }, cache: "no-store" }))
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const saved = await response.json() as ComicBook;
        queue.reset(saved.revision);
        ignoreNextBookEffect = true;
        options.setBook(saved);
        options.onReload(saved);
        lastSavedKey = contentKey(saved);
        setPause(undefined);
        setAccountChanged(false);
        setSaveState("saved");
      }).catch(() => setPause("network"));
  }

  function downloadDraft() {
    const current = options.book();
    const draft = { ...current, revision: queue.revision, recovery: "comic-book-draft-v1" };
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${current.title || "comic-draft"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function beforeLeave(continueNavigation: () => void) {
    const attempt = ++leaveAttempt;
    if (accountChanged()) { setLeaveAction(() => continueNavigation); return; }
    if (options.uploadsBusy()) {
      setLeaveAction(() => continueNavigation);
      return;
    }
    if (queue.hasPending || contentKey(options.book()) !== lastSavedKey) {
      setLeaveAction(() => continueNavigation);
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = undefined; queue.schedule(options.book()); }
      const saved = await queue.flush();
      if (attempt !== leaveAttempt) return;
      if (saved && !options.uploadsBusy() && contentKey(options.book()) === lastSavedKey) {
        setLeaveAction(undefined);
        continueNavigation();
        return;
      }
      return;
    }
    continueNavigation();
  }

  function saveAndContinue() {
    const action = leaveAction();
    setLeaveAction(undefined);
    if (action) void beforeLeave(action);
  }

  useBeforeLeave((event) => {
    if (event.defaultPrevented || (contentKey(options.book()) === lastSavedKey && !queue.hasPending && !options.uploadsBusy())) return;
    event.preventDefault();
    void beforeLeave(() => event.retry(true));
  });

  function discardAndLeave() {
    leaveAttempt += 1;
    const action = leaveAction();
    void discardAndContinue(action);
  }

  async function discardAndContinue(action: (() => void) | undefined) {
    setLeaveAction(undefined);
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = undefined; }
    queue.pause("account");
    await options.cancelUploads();
    queue.reset(queue.revision);
    setLeaveAction(undefined);
    action?.();
  }

  function stay() {
    leaveAttempt += 1;
    setLeaveAction(undefined);
  }

  return { accountChanged, beforeLeave, checkAndResume, discardAndLeave, downloadDraft, leaveAction, pause, reloadSavedBook, saveAndContinue, saveState, stay };
}

function contentKey(book: ComicBook) {
  const { revision: _revision, updatedAt: _updatedAt, ...content } = book;
  return JSON.stringify(content);
}
