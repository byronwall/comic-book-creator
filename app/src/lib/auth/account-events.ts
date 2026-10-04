const eventKey = "comic-account-check";

// Authentication redirects load a new document. Ask other tabs to check their session.
// This stores only a notification nonce, never account data or credentials.
export function notifyAccountTabs() {
  try { localStorage.setItem(eventKey, crypto.randomUUID()); } catch { /* Focus checks still work without storage. */ }
}

export function watchAccountTabs(check: () => void) {
  const visible = () => { if (document.visibilityState === "visible") check(); };
  const changed = (event: StorageEvent) => { if (event.key === eventKey) check(); };
  window.addEventListener("focus", check);
  window.addEventListener("pageshow", check);
  window.addEventListener("storage", changed);
  document.addEventListener("visibilitychange", visible);
  return () => {
    window.removeEventListener("focus", check);
    window.removeEventListener("pageshow", check);
    window.removeEventListener("storage", changed);
    document.removeEventListener("visibilitychange", visible);
  };
}
