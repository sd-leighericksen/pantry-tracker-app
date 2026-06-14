"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Copy, Trash } from "@phosphor-icons/react";

import type { ListedToken, DeviceTokenKind } from "@/lib/device-tokens";
import { issueTokenAction, revokeTokenAction } from "@/app/settings/actions";

const KINDS: { value: DeviceTokenKind; label: string }[] = [
  { value: "api", label: "API (n8n / HA)" },
  { value: "kiosk", label: "Kiosk" },
  { value: "mobile", label: "Mobile" },
];

export function TokenManager({ tokens }: { tokens: ListedToken[] }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<DeviceTokenKind>("api");
  const [issued, setIssued] = useState<{ name: string; token: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function mint(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await issueTokenAction(name, kind);
      if (res.ok) {
        setIssued({ name: res.name, token: res.token });
        setName("");
      } else {
        setError(res.error);
      }
    });
  }

  function revoke(id: number, label: string) {
    if (!confirm(`Revoke "${label}"? Anything using it will stop working.`)) return;
    startTransition(() => revokeTokenAction(id));
  }

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-medium text-ink">Device &amp; API tokens</h2>
        <p className="mt-1 text-sm text-charcoal">
          Bearer tokens for the REST API, n8n, Home Assistant, and provisioning
          the kiosk. The token is shown once — copy it now.
        </p>
      </div>

      <form onSubmit={mint} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-charcoal">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Home Assistant"
            className="h-11 rounded-md border border-hairline-strong bg-surface-card px-3.5 text-ink outline-none focus-visible:border-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-charcoal">Kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as DeviceTokenKind)}
            className="h-11 rounded-md border border-hairline-strong bg-surface-card px-3 text-ink outline-none"
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="h-11 rounded-md bg-accent px-5 font-medium text-accent-on transition-opacity disabled:opacity-50"
        >
          Create
        </button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      {issued && <IssuedToken issued={issued} onDismiss={() => setIssued(null)} />}

      <ul className="flex flex-col gap-2">
        {tokens.length === 0 ? (
          <li className="text-sm text-charcoal">No tokens yet.</li>
        ) : (
          tokens.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-md border border-hairline bg-surface-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-ink">{t.name}</p>
                <p className="text-xs text-charcoal">
                  {t.kind} · last used{" "}
                  {t.lastUsedAt
                    ? new Date(t.lastUsedAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                      })
                    : "never"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke(t.id, t.name)}
                aria-label={`Revoke ${t.name}`}
                className="flex size-9 items-center justify-center rounded-md text-danger"
              >
                <Trash size={18} />
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function IssuedToken({
  issued,
  onDismiss,
}: {
  issued: { name: string; token: string };
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(issued.token);
      setCopied(true);
    } catch {
      /* clipboard blocked — the user can still select the text */
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-accent/40 bg-surface-card p-4">
      <p className="text-sm text-ink">
        Token for <span className="font-medium">{issued.name}</span> — copy it
        now, it won&rsquo;t be shown again.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md bg-surface-deep px-3 py-2 font-mono text-sm text-body">
          {issued.token}
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
      <button
        type="button"
        onClick={onDismiss}
        className="self-start text-xs text-charcoal underline-offset-2 hover:underline"
      >
        Done
      </button>
    </div>
  );
}
