"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { getCurrentSession, signOutTeacher } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      return getCurrentSession();
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      if (!hasSupabaseEnv) return;
      await signOutTeacher();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      if (pathname.startsWith(ROUTES.admin.root)) {
        router.replace(ROUTES.admin.signIn);
      }
    },
  });

  return (
    <header className="border-b border-[color-mix(in_srgb,var(--primary)_78%,#000000)] bg-[var(--primary)] text-[var(--on-primary)] shadow-[0_1px_0_color-mix(in_srgb,var(--on-primary)_6%,transparent)]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <div>
          <Link
            href={ROUTES.home}
            className="text-2xl font-semibold tracking-tight text-[var(--on-primary)] transition hover:brightness-110"
          >
            Mystery Club
          </Link>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href={ROUTES.admin.cases}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--on-primary)]/30 px-3 py-2 text-[var(--on-primary)] transition hover:border-[var(--on-primary)]/55 hover:bg-[var(--on-primary)]/10"
          >
            <Shield className="h-4 w-4" />
            교사
          </Link>
          {sessionQuery.data ? (
            <Button
              variant="secondary"
              onClick={() => signOutMutation.mutate()}
              disabled={signOutMutation.isPending}
              className="border-[var(--on-primary)]/30 bg-[var(--on-primary)]/12 text-[var(--on-primary)] hover:bg-[var(--on-primary)]/18 hover:text-[var(--on-primary)]"
            >
              로그아웃
            </Button>
          ) : (
            <Link
              href={ROUTES.admin.signIn}
              className="inline-flex items-center rounded-md border border-[var(--on-primary)]/30 px-3 py-2 text-[var(--on-primary)] transition hover:border-[var(--on-primary)]/55 hover:bg-[var(--on-primary)]/10"
            >
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
