import { notFound } from "next/navigation";

import { getShareToken, sharedList } from "@/lib/share";

export const metadata = {
  title: "Shopping list",
  robots: { index: false, follow: false },
};

/* Public, unauthenticated read-only shopping list. The token is the gate. */
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const active = getShareToken();
  if (!active || token !== active) notFound();

  const items = sharedList();

  return (
    <main className="mx-auto w-full max-w-[560px] px-4 py-10">
      <header className="mb-6">
        <h1 className="text-[40px] font-semibold leading-none tracking-tight text-ink">
          Shopping list
        </h1>
        <p className="mt-2 text-sm text-charcoal">Shared · read-only</p>
      </header>

      {items.length === 0 ? (
        <p className="text-charcoal">Nothing on the list.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border border-hairline bg-surface-card px-4 py-3"
            >
              <span className="text-lg text-ink">
                {it.name}
                {it.needed && it.needed > 1 && (
                  <span className="ml-2 text-sm text-charcoal">need {it.needed}</span>
                )}
              </span>
              {it.store && <span className="text-sm text-charcoal">{it.store}</span>}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs text-charcoal">Pantry Tracker</p>
    </main>
  );
}
