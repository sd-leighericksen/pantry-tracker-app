"use client";

import { useState, useTransition } from "react";
import { Copy } from "@phosphor-icons/react";

import { disableShareAction, enableShareAction } from "@/app/settings/actions";

/* Shareable read-only shopping list (BRIEF §5.5). Off by default. */
export function ShareManager({ token }: { token: string | null }) {
  const [current, setCurrent] = useState<string | null>(token);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const link =
    current && typeof window !== "undefined"
      ? `${window.location.origin}/share/${current}`
      : null;

  function enable() {
    startTransition(async () => {
      const res = await enableShareAction();
      if (res) {
        setCurrent(res.token);
        setCopied(false);
      }
    });
  }

  function disable() {
    if (!confirm("Disable the share link? The current URL will stop working.")) return;
    startTransition(async () => {
      await disableShareAction();
      setCurrent(null);
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-medium text-ink">Share shopping list</h2>
        <p className="mt-1 text-sm text-charcoal">
          A read-only link to the current list — handy for sending to someone
          without a login. Anyone with the link can view it.
        </p>
      </div>

      {current && link ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md bg-surface-deep px-3 py-2 font-mono text-sm text-body">
              {link}
            </code>
            <button
              type="button"
              onClick={copy}
              className="flex h-10 items-center gap-1.5 rounded-md bg-surface-elevated px-3 text-sm text-ink"
            >
              <Copy size={16} />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={enable}
              disabled={pending}
              className="h-10 rounded-md border border-hairline-strong px-4 text-sm text-ink disabled:opacity-50"
            >
              Regenerate
            </button>
            <button
              type="button"
              onClick={disable}
              disabled={pending}
              className="h-10 rounded-md px-4 text-sm text-danger disabled:opacity-50"
            >
              Disable
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={pending}
          className="self-start rounded-md bg-accent px-5 py-2.5 font-medium text-accent-on disabled:opacity-50"
        >
          Create share link
        </button>
      )}
    </section>
  );
}
