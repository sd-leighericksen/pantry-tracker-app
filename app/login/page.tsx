import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Sign in · Pantry Tracker" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const { next } = await searchParams;

  /* Only allow same-origin relative redirects. */
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (user) redirect(safeNext);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-[380px]">
        <header className="mb-8">
          <p className="font-mono text-xs uppercase tracking-widest text-charcoal">
            Pantry Tracker
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
            Sign in
          </h1>
        </header>
        <LoginForm next={safeNext} />
      </div>
    </main>
  );
}
