import { createResource, createSignal, ErrorBoundary, Show, Suspense } from "solid-js";
import { A, revalidate } from "@solidjs/router";
import { getAdminSnapshot } from "~/lib/admin/data";
import { AdminDashboard } from "~/components/admin/AdminDashboard";
import { PageMeta } from "~/lib/seo";

export default function AdminRoute() {
  const [snapshot, { refetch }] = createResource(() => getAdminSnapshot());
  const [refreshing, setRefreshing] = createSignal(false);
  const [refreshError, setRefreshError] = createSignal(false);
  const refresh = async () => {
    setRefreshing(true);
    setRefreshError(false);
    try {
      await revalidate(getAdminSnapshot.key);
      await refetch();
    } catch { setRefreshError(true); }
    finally { setRefreshing(false); }
  };
  return (
    <>
      <PageMeta title="Admin | ComicBam" description="Private account and activity management." />
      <ErrorBoundary fallback={(_, reset) => (
        <div class="comic-app"><main class="comic-main admin-main"><h1>Admin could not load</h1><p role="alert">Check account and activity storage, then try again.</p><div class="admin-filters"><button class="comic-btn" type="button" onClick={() => { reset(); refresh(); }}>Try again</button><A href="/books" class="comic-btn">My Books</A></div></main></div>
      )}>
        <Suspense fallback={<div class="comic-app"><main class="comic-main admin-main"><h1>Admin</h1><p role="status">Loading accounts and activity…</p></main></div>}>
          <Show when={snapshot.latest}>{(data) => <AdminDashboard snapshot={data()} refreshing={snapshot.loading || refreshing()} refreshError={refreshError() || Boolean(snapshot.error)} onRefresh={refresh} />}</Show>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
