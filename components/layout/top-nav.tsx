"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";

import { getCurrentSession, signOutTeacher } from "@/lib/api/auth";
import { AdminSubNav } from "@/components/layout/admin-sub-nav";
import { Button } from "@/components/ui/button";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth-session-query";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

function showAdminSubNav(pathname: string) {
  if (!pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/admin/login") || pathname.startsWith("/admin/signup")) return false;
  if (pathname.startsWith("/admin/sessions/host") || pathname.startsWith("/admin/sessions/report")) {
    return false;
  }
  return true;
}

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
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
      await queryClient.invalidateQueries({ queryKey: AUTH_SESSION_QUERY_KEY });
      if (pathname.startsWith("/admin")) {
        router.replace(ROUTES.admin.login);
      }
    },
  });

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[color-mix(in_srgb,var(--primary)_78%,#000000)] bg-[var(--primary)] text-[var(--on-primary)] shadow-[0_1px_0_color-mix(in_srgb,var(--on-primary)_6%,transparent)]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <Link
              href={ROUTES.home}
              className="text-2xl font-semibold tracking-tight text-[var(--on-primary)] transition hover:brightness-110"
            >
              Mystery Club
            </Link>
          </div>
          <nav className="flex flex-wrap items-center justify-end gap-2 text-sm">
            <Link
              href={ROUTES.play}
              className="rounded-md px-2.5 py-2 text-sm text-[var(--on-primary)]/90 underline-offset-4 transition hover:text-[var(--on-primary)] hover:underline"
            >
              학생 입장
            </Link>
            {sessionQuery.isPending ? (
              <span
                className="inline-block h-10 w-[7.5rem] shrink-0 animate-pulse rounded-md bg-[var(--on-primary)]/12"
                aria-label="로그인 여부 확인 중"
              />
            ) : sessionQuery.data ? (
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
                href={ROUTES.admin.login}
                className="rounded-md bg-[var(--on-primary)] px-4 py-2.5 text-sm font-bold tracking-tight text-[var(--primary)] shadow-md ring-1 ring-[var(--on-primary)]/30 transition hover:brightness-95"
              >
                지금 시작하기
              </Link>
            )}
          </nav>
        </div>
      </header>
      {showAdminSubNav(pathname) ? <AdminSubNav /> : null}
    </>
  );
}
