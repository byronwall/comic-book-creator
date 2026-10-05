import { createMemo, createSignal, Show } from "solid-js";
import { A, useSearchParams } from "@solidjs/router";
import { appPath } from "~/lib/router/app-path";
import type { AdminSnapshot } from "~/lib/admin/types";
import { ComicAppNav } from "~/components/comics/ComicAppNav";
import { AdminUsers } from "./AdminUsers";
import { AdminUserDetails } from "./AdminUserDetails";
import { AdminLedger } from "./AdminLedger";
import { formatBytes, formatDate } from "./format";
import "~/components/comics/comic-creator.css";
import "./admin.css";

export function AdminDashboard(props: { snapshot: AdminSnapshot; refreshing: boolean; refreshError: boolean; onRefresh: () => void }) {
  const [params, setParams] = useSearchParams();
  const [period, setPeriod] = createSignal("7");
  const [feedback, setFeedback] = createSignal<{ message: string; failed: boolean }>();
  const selectedId = () => typeof params.user === "string" ? params.user : "";
  const selected = createMemo(() => props.snapshot.users.find((user) => user.id === selectedId()));
  const cutoff = () => period() === "all" ? "" : new Date(Date.parse(props.snapshot.generatedAt) - Number(period()) * 86_400_000).toISOString();
  const events = createMemo(() => props.snapshot.events.filter((event) => event.at >= cutoff()));
  const active = () => props.snapshot.users.filter((user) => user.lastActivity && user.lastActivity >= cutoff()).length;
  const newUsers = () => props.snapshot.users.filter((user) => user.createdAt >= cutoff()).length;
  const created = () => events().filter((event) => event.type === "book.created").length;
  const edited = () => new Set(events().filter((event) => event.type === "book.saved").map((event) => event.bookId)).size;
  const bytes = () => props.snapshot.users.reduce((total, user) => total + user.bytes, 0);
  return (
    <div class="comic-app admin-app">
      <ComicAppNav account={props.snapshot.account} />
      <main class="comic-main admin-main">
        <header class="comic-topbar"><div><h1>Admin</h1><p>Who is here, what they make, and how their accounts are doing.</p></div>
          <button type="button" class="comic-btn" disabled={props.refreshing} onClick={() => props.onRefresh()}>{props.refreshing ? "Refreshing…" : "Refresh data"}</button>
        </header>
        <Show when={props.refreshError}><p role="alert" class="account-error">The latest data could not load. These are the previous results. Try Refresh data, or <A href={`/sign-in?returnTo=${encodeURIComponent(appPath("/admin"))}`}>sign in again</A>.</p></Show>
        <Show when={feedback()}>{(result) => <p role={result().failed ? "alert" : "status"} classList={{ "account-error": result().failed, "admin-success": !result().failed }}>{result().message}</p>}</Show>
        <section class="admin-panel" aria-labelledby="admin-activity-title">
          <div class="admin-section-heading"><div><h2 id="admin-activity-title">Activity overview</h2><p>{props.snapshot.users.length} accounts · {props.snapshot.users.filter((user) => user.disabled).length} disabled</p></div>
            <label class="admin-period">Activity period<select value={period()} onChange={(event) => setPeriod(event.currentTarget.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All recorded activity</option></select></label>
          </div>
          <dl class="admin-stat-strip"><div><dt>Active accounts</dt><dd>{active()}</dd></div><div><dt>New accounts</dt><dd>{newUsers()}</dd></div><div><dt>Books created</dt><dd>{created()}</dd></div><div><dt>Books edited</dt><dd>{edited()}</dd></div></dl>
          <p class="admin-note">Active accounts have a signup, sign-in, book view, or library change in this period. Earlier book edits count toward last activity.</p>
        </section>
        <AdminUsers users={props.snapshot.users} selectedId={selectedId()} onSelect={(id) => { setParams({ user: id }, { scroll: false }); setFeedback(undefined); }} />
        <Show when={selected()}>{(user) => <AdminUserDetails user={user()} actorId={props.snapshot.account.id} onClose={() => setParams({ user: undefined }, { scroll: false })} onResult={(message, failed) => setFeedback({ message, failed })} onRefresh={props.onRefresh} />}</Show>
        <Show when={selectedId() && !selected()}><p class="admin-note">This account is no longer in the user table.</p></Show>
        <AdminLedger events={props.snapshot.events} users={props.snapshot.users} capturedSince={props.snapshot.capturedSince} />
        <section class="admin-panel" aria-labelledby="admin-storage-title">
          <div class="admin-section-heading"><div><h2 id="admin-storage-title">Storage</h2><p>Current library files and retained activity records.</p></div></div>
          <dl class="admin-stat-strip"><div><dt>Books and photos</dt><dd>{formatBytes(bytes())}</dd></div><div><dt>Event log</dt><dd>{formatBytes(props.snapshot.eventBytes)}</dd></div><div><dt>Retained events</dt><dd>{props.snapshot.eventCount}</dd></div></dl>
          <p class="admin-note">Events remain until you decide to remove them. Storage totals exclude sessions, backups, and unrelated project data.</p>
        </section>
        <p class="admin-note">Snapshot updated {formatDate(props.snapshot.generatedAt)}. Refresh to see new activity.</p>
      </main>
    </div>
  );
}
