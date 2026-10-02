import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { UtensilsCrossed, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";

export function AppShell({
  children,
  subtitle,
  links,
}: {
  children: ReactNode;
  subtitle?: string;
  links?: { to: string; label: string }[];
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="hero-gradient text-primary-foreground">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-5 py-5">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <UtensilsCrossed className="size-5" />
            Dining Unklab
          </Link>
          {subtitle ? <span className="text-sm opacity-80">{subtitle}</span> : null}
          <nav className="ml-auto flex items-center gap-1 text-sm">
            {(links ?? []).map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-lg px-3 py-1.5 opacity-80 transition hover:bg-primary-foreground/15 hover:opacity-100"
                activeProps={{ className: "rounded-lg px-3 py-1.5 bg-primary-foreground/20 opacity-100" }}
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={signOut}
              className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-primary-foreground/30 px-3 py-1.5 transition hover:bg-primary-foreground/15"
            >
              <LogOut className="size-4" /> Keluar
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}
