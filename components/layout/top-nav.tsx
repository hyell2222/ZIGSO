"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      if (!hasSupabaseEnv) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      if (pathname.startsWith(ROUTES.admin.root)) {
        router.replace(ROUTES.admin.signIn);
      }
    },
  });

  return (
    <header className="border-b border-slate-800 bg-slate-950/90">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <div>
          <Link href={ROUTES.home} className="text-xs uppercase tracking-[0.22em] text-cyan-400/90">
            CODEZERO
          </Link>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href={ROUTES.admin.projects}
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-slate-200 hover:border-cyan-400/60 hover:text-cyan-300"
          >
            <Shield className="h-4 w-4" />
            Teacher
          </Link>
          {sessionQuery.data ? (
            <Button
              variant="secondary"
              onClick={() => signOutMutation.mutate()}
              disabled={signOutMutation.isPending}
            >
              Sign Out
            </Button>
          ) : (
            <Link
              href={ROUTES.admin.signIn}
              className="inline-flex items-center rounded-md border border-slate-700 px-3 py-2 text-slate-200 hover:border-cyan-400/60 hover:text-cyan-300"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
