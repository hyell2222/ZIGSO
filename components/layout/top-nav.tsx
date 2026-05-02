"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";

import { getCurrentSession, signOutTeacher } from "@/lib/api/auth";
import { TeacherSubNav } from "@/components/layout/teacher-sub-nav";
import { Button, ButtonLink } from "@/components/ui/button";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth-session-query";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

function showTeacherSubNav(pathname: string) {
  const p = pathname.split("?")[0] ?? "";
  if (p.startsWith("/login")) return false;
  if (p.startsWith("/signup")) return false;
  if (p.startsWith("/play")) return false;
  if (p.startsWith("/sessions")) return false;
  if (p.startsWith("/cases/new")) return false;
  if (p.startsWith("/cases/edit")) return false;
  if (p.startsWith("/cases") || p.startsWith("/reports")) return true;
  return false;
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
      const onTeacherSite =
        pathname.startsWith("/cases") ||
        pathname.startsWith("/reports") ||
        pathname.startsWith("/sessions");
      if (onTeacherSite) {
        router.replace(ROUTES.home);
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
              학생 참가
            </Link>
            {sessionQuery.data ? (
              <Button
                variant="transparent"
                onClick={() => signOutMutation.mutate()}
                disabled={signOutMutation.isPending}
              >
                로그아웃
              </Button>
            ) : (
              <ButtonLink
                href={ROUTES.login}
                variant="transparent"
              >
                지금 시작하기
              </ButtonLink>
            )}
          </nav>
        </div>
      </header>
      {showTeacherSubNav(pathname) ? <TeacherSubNav /> : null}
    </>
  );
}
