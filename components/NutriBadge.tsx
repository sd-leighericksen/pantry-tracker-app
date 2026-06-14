/* Nutri-Score letter pill (DESIGN.md badge-nutri). The five-step functional
 * scale lives ONLY here and on the pantry-health visual — never as chrome. */

const SCALE: Record<string, { bg: string; text: string }> = {
  a: { bg: "bg-nutri-a", text: "text-ink" },
  b: { bg: "bg-nutri-b", text: "text-ink" },
  c: { bg: "bg-nutri-c", text: "text-on-light" }, // yellow needs dark label for AA
  d: { bg: "bg-nutri-d", text: "text-ink" },
  e: { bg: "bg-nutri-e", text: "text-ink" },
};

export function NutriBadge({ score }: { score: string }) {
  const key = score.trim().toLowerCase();
  const tone = SCALE[key];
  if (!tone) return null;

  return (
    <span
      className={`inline-flex h-6 items-center rounded-full px-2.5 text-sm font-medium uppercase ${tone.bg} ${tone.text}`}
      aria-label={`Nutri-Score ${key.toUpperCase()}`}
    >
      {key.toUpperCase()}
    </span>
  );
}
