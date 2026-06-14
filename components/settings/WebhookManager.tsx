"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Trash } from "@phosphor-icons/react";

import type { Webhook } from "@/lib/webhooks";
import { WEBHOOK_EVENTS } from "@/lib/webhook-events";
import {
  createWebhookAction,
  deleteWebhookAction,
  testWebhookAction,
  toggleWebhookAction,
} from "@/app/settings/actions";

const EVENT_OPTIONS = ["all", ...WEBHOOK_EVENTS];

export function WebhookManager({ webhooks }: { webhooks: Webhook[] }) {
  const [url, setUrl] = useState("");
  const [eventType, setEventType] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [testNote, setTestNote] = useState<Record<number, string>>({});
  const [pending, startTransition] = useTransition();

  function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createWebhookAction(eventType, url);
      if (res.ok) setUrl("");
      else setError(res.error ?? "Could not add.");
    });
  }

  function test(id: number) {
    setTestNote((n) => ({ ...n, [id]: "…" }));
    startTransition(async () => {
      const res = await testWebhookAction(id);
      setTestNote((n) => ({ ...n, [id]: res.ok ? "✓ sent" : (res.error ?? "failed") }));
    });
  }

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-medium text-ink">Webhooks</h2>
        <p className="mt-1 text-sm text-charcoal">
          POST a JSON payload to a URL (e.g. an n8n webhook node) when events
          happen. Expiry events fire when{" "}
          <code className="font-mono text-body">/api/v1/cron/expiry-check</code>{" "}
          is triggered.
        </p>
      </div>

      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-charcoal">Payload URL</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://n8n.example.com/webhook/…"
            className="h-11 rounded-md border border-hairline-strong bg-surface-card px-3.5 text-ink outline-none focus-visible:border-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-charcoal">Event</span>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="h-11 rounded-md border border-hairline-strong bg-surface-card px-3 text-ink outline-none"
          >
            {EVENT_OPTIONS.map((ev) => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={pending || !url.trim()}
          className="h-11 rounded-md bg-accent px-5 font-medium text-accent-on transition-opacity disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      <ul className="flex flex-col gap-2">
        {webhooks.length === 0 ? (
          <li className="text-sm text-charcoal">No webhooks yet.</li>
        ) : (
          webhooks.map((w) => (
            <li
              key={w.id}
              className="flex items-center justify-between gap-3 rounded-md border border-hairline bg-surface-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{w.url}</p>
                <p className="text-xs text-charcoal">
                  {w.eventType}
                  {testNote[w.id] && (
                    <span className="ml-2 text-body">{testNote[w.id]}</span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => test(w.id)}
                  className="h-9 rounded-md px-3 text-xs text-charcoal"
                >
                  Test
                </button>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(() => toggleWebhookAction(w.id, !w.enabled))
                  }
                  className={`h-9 rounded-md px-3 text-xs font-medium ${
                    w.enabled ? "text-accent" : "text-charcoal"
                  }`}
                >
                  {w.enabled ? "Enabled" : "Disabled"}
                </button>
                <button
                  type="button"
                  onClick={() => startTransition(() => deleteWebhookAction(w.id))}
                  aria-label="Delete webhook"
                  className="flex size-9 items-center justify-center rounded-md text-danger"
                >
                  <Trash size={18} />
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
