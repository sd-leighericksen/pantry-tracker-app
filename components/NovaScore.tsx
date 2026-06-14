/* Official NOVA group graphic (in /public/nova). Renders nothing when the
 * item has no NOVA group (1–4). */
export function NovaScore({
  nova,
  className = "h-9",
}: {
  nova: number | null;
  className?: string;
}) {
  if (nova === null || nova < 1 || nova > 4) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- static SVG in /public */
    <img src={`/nova/${nova}.svg`} alt={`NOVA group ${nova}`} className={`w-auto ${className}`} />
  );
}
