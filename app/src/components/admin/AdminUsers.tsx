import { For, Show, createMemo, createSignal } from "solid-js";
import type { AdminUser } from "~/lib/admin/types";
import { formatBytes, formatDate } from "./format";

export function AdminUsers(props: { users: AdminUser[]; selectedId: string; onSelect: (id: string) => void }) {
  const [search, setSearch] = createSignal("");
  const [status, setStatus] = createSignal("all");
  const visible = createMemo(() => props.users.filter((user) =>
    user.username.includes(search().trim().toLowerCase()) &&
    (status() === "all" || user.disabled === (status() === "disabled")),
  ));
  return (
    <section class="admin-panel" aria-labelledby="admin-users-title">
      <div class="admin-section-heading">
        <div><h2 id="admin-users-title">Users</h2><p>Select a username to inspect their library and manage their account.</p></div>
        <p class="admin-count">{visible().length} of {props.users.length}</p>
      </div>
      <div class="admin-filters">
        <label>Find a user<input type="search" value={search()} onInput={(event) => setSearch(event.currentTarget.value)} placeholder="Search usernames" /></label>
        <label>Account status<select value={status()} onChange={(event) => setStatus(event.currentTarget.value)}>
          <option value="all">All accounts</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option>
        </select></label>
      </div>
      <div class="admin-table-scroll" tabindex="0" role="region" aria-label="User table">
        <table class="admin-table">
          <thead><tr><th scope="col">Username</th><th scope="col">Status</th><th scope="col">Joined</th><th scope="col">Last activity</th><th scope="col">Books</th><th scope="col">Pages</th><th scope="col">Photos</th><th scope="col">Storage</th></tr></thead>
          <tbody><For each={visible()}>{(user) => (
            <tr classList={{ selected: props.selectedId === user.id }}>
              <th scope="row"><button type="button" class="admin-user-link" aria-pressed={props.selectedId === user.id} onClick={() => props.onSelect(user.id)}>{user.username}</button></th>
              <td><span class="admin-status" classList={{ disabled: user.disabled }}>{user.disabled ? "Disabled" : user.isAdmin ? "Admin" : "Enabled"}</span></td>
              <td>{user.createdAt.slice(0, 10)}</td><td>{formatDate(user.lastActivity)}</td>
              <td>{user.books}</td><td>{user.pages}</td><td>{user.photos}</td><td>{formatBytes(user.bytes)}</td>
            </tr>
          )}</For></tbody>
        </table>
      </div>
      <Show when={visible().length === 0}><p class="admin-empty">{props.users.length ? "No users match these filters." : "No accounts have been created."}</p></Show>
    </section>
  );
}
