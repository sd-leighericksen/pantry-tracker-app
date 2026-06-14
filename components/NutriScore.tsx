/* Official Nutri-Score graphic (Open Food Facts artwork in /public/nutriscore).
 * Falls back to the "unknown" image when the item has no a–e grade, so every
 * item shows a Nutri-Score. Sized by height; width scales (~1.5–1.85:1). */

const GRADES = new Set(["a", "b", "c", "d", "e"]);

export function NutriScore({
  score,
  className = "h-9",
}: {
  score: string | null;
  className?: string;
}) {
  const g = score?.trim().toLowerCase();
  const file = g && GRADES.has(g) ? g : "unknown";
  const label = g && GRADES.has(g) ? `Nutri-Score ${g.toUpperCase()}` : "No Nutri-Score";
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- static SVG in /public */
    <img src={`/nutriscore/${file}.svg`} alt={label} className={`w-auto ${className}`} />
  );
}
