"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const ERRORS: Record<string, string> = {
  invalid_credentials: "Incorrect username or password.",
  too_many_attempts: "Too many attempts. Wait a few minutes and try again.",
  invalid_body: "Please enter a username and password.",
};

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(ERRORS[data?.error ?? ""] ?? "Sign in failed. Try again.");
        setPending(false);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-charcoal">Username</span>
        <input
          type="text"
          name="username"
          autoComplete="username"
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="h-11 rounded-md border border-hairline-strong bg-surface-card px-3.5 text-ink outline-none transition-colors placeholder:text-ash focus-visible:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-charcoal">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 rounded-md border border-hairline-strong bg-surface-card px-3.5 text-ink outline-none transition-colors placeholder:text-ash focus-visible:border-accent"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !username || !password}
        className="mt-2 flex h-11 items-center justify-center rounded-md bg-accent px-5 font-medium text-accent-on transition-opacity disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
