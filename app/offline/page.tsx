export const metadata = { title: "Offline · Pantry Tracker" };

/* Shown by the service worker when a navigation fails offline (BRIEF §6:
 * graceful offline messaging). */
export default function OfflinePage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Offline</h1>
      <p className="max-w-[40ch] text-charcoal">
        You&rsquo;re not connected. The shopping list and inventory will load
        again once you&rsquo;re back online.
      </p>
    </main>
  );
}
