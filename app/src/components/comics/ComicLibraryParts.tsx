/** Deterministic cover color (0-4) so server and client renders match. */
export function coverTone(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return String(hash % 5);
}

const updatedFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function formatUpdated(updatedAt: string) {
  const date = new Date(updatedAt);
  return Number.isNaN(date.getTime()) ? updatedAt.slice(0, 10) : updatedFormat.format(date);
}

export function LibraryEmptyState() {
  return (
    <section class="comic-library-empty" aria-labelledby="library-empty-title">
      <svg class="comic-library-empty-art" viewBox="0 0 120 96" aria-hidden="true">
        <rect x="6" y="6" width="108" height="84" rx="6" fill="#fff" stroke="#1b1733" stroke-width="4" />
        <rect x="16" y="16" width="42" height="64" rx="3" fill="#e3edff" stroke="#1b1733" stroke-width="3" />
        <rect x="64" y="16" width="40" height="30" rx="3" fill="#fff3c4" stroke="#1b1733" stroke-width="3" />
        <rect x="64" y="50" width="40" height="30" rx="3" fill="#ffe4df" stroke="#1b1733" stroke-width="3" />
        <path d="M22 30q0-6 6-6h22q6 0 6 6v8q0 6-6 6H36l-6 6v-6h-2q-6 0-6-6z" fill="#fff" stroke="#1b1733" stroke-width="2.5" />
        <path d="m84 23 3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#ffd23f" stroke="#1b1733" stroke-width="2" />
      </svg>
      <h2 id="library-empty-title">No books yet!</h2>
      <p>Give your first comic a name in the yellow box, then press Create New Book.</p>
    </section>
  );
}
