import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import {
  flowTotals,
  monthlyVolumes,
  mostUsed,
  mostWasted,
  pantryHealth,
  wasteLog,
  type MassVolume,
} from "@/lib/reports";
import { PantryHealth } from "@/components/PantryHealth";
import { AiSummary } from "@/components/AiSummary";
import { readCachedSummary } from "@/lib/summary";

export const metadata = { title: "Reports · Pantry Tracker" };

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/reports");

  const months = monthlyVolumes();
  const used = mostUsed();
  const wasted = mostWasted();
  const waste = wasteLog();
  const health = pantryHealth();
  const flow = flowTotals();
  const summary = readCachedSummary();
  const aiConfigured = Boolean(process.env.OPENROUTER_API_KEY);

  const maxVol = Math.max(1, ...months.flatMap((m) => [m.in, m.out]));

  return (
    <main className="mx-auto w-full max-w-[1000px] px-6 py-8">
      <h1 className="mb-8 text-[40px] font-semibold leading-none tracking-tight text-ink">
        Reports
      </h1>

      <div className="flex flex-col gap-10">
        {hasFlow(flow) && (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FlowCard label="Brought in" mv={flow.broughtIn} />
            <FlowCard label="Consumed" mv={flow.consumed} />
            <FlowCard label="Wasted" mv={flow.wasted} tone="danger" />
          </section>
        )}

        <AiSummary cached={summary} configured={aiConfigured} />

        <PantryHealth data={health} />

        {/* Monthly in / out volumes */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-medium text-ink">Monthly volume</h2>
          <div className="flex items-end gap-4" style={{ height: 180 }}>
            {months.map((m) => (
              <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end justify-center gap-1">
                  <Bar value={m.in} max={maxVol} className="bg-accent" title={`${m.in} in`} />
                  <Bar value={m.out} max={maxVol} className="bg-mute" title={`${m.out} out`} />
                </div>
                <span className="text-xs text-charcoal">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 text-xs text-charcoal">
            <Legend className="bg-accent" label="In" />
            <Legend className="bg-mute" label="Out" />
          </div>
        </section>

        {/* Most used */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-medium text-ink">Most used</h2>
          {used.length === 0 ? (
            <p className="text-sm text-charcoal">No usage recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {used.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/items/${u.id}`}
                    className="flex items-center justify-between rounded-md border border-hairline bg-surface-card px-4 py-3 text-sm"
                  >
                    <span className="text-ink">{u.name}</span>
                    <span className="font-mono tabular-nums text-charcoal">
                      {u.used} used
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Most wasted */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-medium text-ink">Most wasted</h2>
          {wasted.length === 0 ? (
            <p className="text-sm text-charcoal">
              Nothing scanned as wasted yet — arm <span className="text-ink">Wasted</span> on
              the kiosk when you bin something.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {wasted.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/items/${w.id}`}
                    className="flex items-center justify-between rounded-md border border-danger/40 bg-surface-card px-4 py-3 text-sm"
                  >
                    <span className="text-ink">{w.name}</span>
                    <span className="font-mono tabular-nums text-danger">
                      {w.wasted} wasted
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Waste / expired on hand */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-medium text-ink">
            Expired on hand
            {waste.length > 0 && (
              <span className="ml-2 font-mono text-base tabular-nums text-danger">
                {waste.length}
              </span>
            )}
          </h2>
          {waste.length === 0 ? (
            <p className="text-sm text-charcoal">Nothing expired — nice.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {waste.map((w) => (
                <li key={`${w.itemId}-${w.daysExpired}`}>
                  <Link
                    href={`/items/${w.itemId}`}
                    className="flex items-center justify-between rounded-md border border-danger/40 bg-surface-card px-4 py-3 text-sm"
                  >
                    <span className="text-ink">
                      {w.name}
                      {w.quantity > 1 && (
                        <span className="ml-2 font-mono text-charcoal">×{w.quantity}</span>
                      )}
                    </span>
                    <span className="text-danger">
                      {w.daysExpired === 0
                        ? "expired today"
                        : `${w.daysExpired}d ago`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function Bar({
  value,
  max,
  className,
  title,
}: {
  value: number;
  max: number;
  className: string;
  title: string;
}) {
  return (
    <div
      title={title}
      className={`w-3 rounded-t-sm ${className}`}
      style={{ height: `${(value / max) * 100}%`, minHeight: value > 0 ? 3 : 0 }}
    />
  );
}

function hasFlow(flow: {
  broughtIn: MassVolume;
  consumed: MassVolume;
  wasted: MassVolume;
}): boolean {
  return [flow.broughtIn, flow.consumed, flow.wasted].some(
    (m) => m.grams > 0 || m.millilitres > 0,
  );
}

function FlowCard({
  label,
  mv,
  tone = "default",
}: {
  label: string;
  mv: MassVolume;
  tone?: "default" | "danger";
}) {
  const colour = tone === "danger" ? "text-danger" : "text-ink";
  const none = mv.grams === 0 && mv.millilitres === 0;
  return (
    <div className="rounded-lg border border-hairline bg-surface-card p-4">
      <p className="text-sm text-charcoal">{label}</p>
      {none ? (
        <p className="mt-1 font-mono text-3xl tabular-nums text-mute">—</p>
      ) : (
        <div className="mt-1 flex flex-col">
          {mv.grams > 0 && (
            <span className={`font-mono text-3xl tabular-nums ${colour}`}>
              {formatMass(mv.grams)}
            </span>
          )}
          {mv.millilitres > 0 && (
            <span className={`font-mono text-3xl tabular-nums ${colour}`}>
              {formatVolume(mv.millilitres)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function formatMass(grams: number): string {
  return grams >= 1000
    ? `${(grams / 1000).toFixed(1)} kg`
    : `${Math.round(grams)} g`;
}

function formatVolume(ml: number): string {
  return ml >= 1000 ? `${(ml / 1000).toFixed(1)} L` : `${Math.round(ml)} mL`;
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
