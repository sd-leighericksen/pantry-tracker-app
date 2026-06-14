"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

import type { GradeCount } from "@/lib/reports";

/* "Health of our pantry" (DESIGN.md): the one place beyond badges the
 * Nutri-Score scale appears. Bars grow in, staggered 40ms — allowed to run
 * longer than the scan-feedback budget because it plays once per view. */

const GRADE_BG: Record<GradeCount["grade"], string> = {
  a: "bg-nutri-a",
  b: "bg-nutri-b",
  c: "bg-nutri-c",
  d: "bg-nutri-d",
  e: "bg-nutri-e",
  unrated: "bg-stone",
};

export function PantryHealth({ data }: { data: GradeCount[] }) {
  const root = useRef<HTMLDivElement>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((n, d) => n + d.count, 0);

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(root.current!.querySelectorAll("[data-bar]"), {
          scaleY: 0,
          transformOrigin: "bottom",
          duration: 0.5,
          ease: "power3.out",
          stagger: 0.04,
        });
      });
    },
    { scope: root },
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-medium text-ink">Pantry health</h2>
        <span className="text-sm text-charcoal">
          {total} item{total === 1 ? "" : "s"} in stock
        </span>
      </div>

      {total === 0 ? (
        <p className="text-sm text-charcoal">No stock on hand to assess.</p>
      ) : (
        <div ref={root} className="flex items-end gap-3" style={{ height: 160 }}>
          {data.map((d) => (
            <div key={d.grade} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  data-bar
                  className={`w-full rounded-t-md ${GRADE_BG[d.grade]}`}
                  style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }}
                />
              </div>
              <span className="font-mono text-sm tabular-nums text-ink">
                {d.count}
              </span>
              <span className="text-xs uppercase text-charcoal">
                {d.grade === "unrated" ? "—" : d.grade}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
