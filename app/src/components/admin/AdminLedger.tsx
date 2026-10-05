import { createMemo, createSignal, For, Show } from "solid-js";
import { eventLabels, type ActivityEvent, type AdminUser, type EventType } from "~/lib/admin/types";
import { formatDate } from "./format";

export function AdminLedger(props: { events: ActivityEvent[]; users: AdminUser[]; capturedSince: string | null }) {
  const [userId, setUserId] = createSignal("");
  const [type, setType] = createSignal("");
  const [from, setFrom] = createSignal("");
  const [to, setTo] = createSignal("");
  const [limit, setLimit] = createSignal(50);
  const names = createMemo(() => {
    const users = new Map(props.users.map((user) => [user.id, user.username]));
    for (const event of props.events) {
      if (!users.has(event.userId)) users.set(event.userId, `Deleted account (${event.userId.slice(0, 8)})`);
      if (event.targetUserId && !users.has(event.targetUserId)) {
        users.set(event.targetUserId, event.targetUsername ? `${event.targetUsername} (deleted)` : `Deleted account (${event.targetUserId.slice(0, 8)})`);
      }
    }
    return users;
  });
  const name = (id: string) => names().get(id) ?? `Deleted account (${id.slice(0, 8)})`;
  const filtered = createMemo(() => props.events.filter((event) =>
    (!userId() || event.userId === userId() || event.targetUserId === userId()) &&
    (!type() || event.type === type()) &&
    (!from() || event.at.slice(0, 10) >= from()) && (!to() || event.at.slice(0, 10) <= to()),
  ));
  const resetLimit = () => setLimit(50);
  return (
    <section class="admin-panel" aria-labelledby="admin-ledger-title">
      <div class="admin-section-heading"><div><h2 id="admin-ledger-title">Event ledger</h2><p>See who signed in, opened a book, or changed their library.</p></div><p class="admin-count">{filtered().length} events</p></div>
      <div class="admin-filters admin-ledger-filters">
        <label>User<select value={userId()} onChange={(event) => { setUserId(event.currentTarget.value); resetLimit(); }}><option value="">All users</option><For each={[...names()]}>{([id, username]) => <option value={id}>{username}</option>}</For></select></label>
        <label>Event<select value={type()} onChange={(event) => { setType(event.currentTarget.value); resetLimit(); }}><option value="">All events</option><For each={Object.keys(eventLabels) as EventType[]}>{(key) => <option value={key}>{eventLabels[key]}</option>}</For></select></label>
        <label>From (UTC)<input type="date" value={from()} max={to() || undefined} onInput={(event) => { setFrom(event.currentTarget.value); resetLimit(); }} /></label>
        <label>Through (UTC)<input type="date" value={to()} min={from() || undefined} onInput={(event) => { setTo(event.currentTarget.value); resetLimit(); }} /></label>
      </div>
      <p class="admin-note">Book opens and edits are grouped into five-minute intervals. Photo events count uploads, including crop updates.</p>
      <div class="admin-table-scroll" tabindex="0" role="region" aria-label="Event ledger">
        <table class="admin-table admin-event-table"><thead><tr><th scope="col">Time (UTC)</th><th scope="col">User</th><th scope="col">Event</th><th scope="col">Details</th></tr></thead>
          <tbody><For each={filtered().slice(0, limit())}>{(event) => <tr>
            <td>{formatDate(event.at)}</td><td>{name(event.userId)}</td><td>{eventLabels[event.type]}</td>
            <td>{event.targetUserId ? `Account: ${event.targetUsername ?? name(event.targetUserId)}` : event.bookId ? `Book ${event.bookId.slice(0, 8)}` : "—"}</td>
          </tr>}</For></tbody>
        </table>
      </div>
      <Show when={filtered().length === 0}><p class="admin-empty">{props.events.length ? "No events match these filters." : "Activity will appear when people sign in or use their books."}</p></Show>
      <Show when={filtered().length > limit()}><button type="button" class="comic-btn admin-more" onClick={() => setLimit(limit() + 50)}>Show 50 more events</button></Show>
      <p class="admin-note">{props.capturedSince ? `Recording since ${formatDate(props.capturedSince)}. Earlier activity was not recorded.` : "Recording starts with the first new event."}</p>
    </section>
  );
}
