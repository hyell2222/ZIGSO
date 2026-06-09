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
  if (p.startsWith("/activities/new")) return false;
  if (p.startsWith("/activities/edit")) return false;
  if (p.startsWith("/activities") || p.startsWith("/reports")) return true;
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
      router.replace(ROUTES.home);
    },
  });

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[color-mix(in_srgb,var(--primary)_78%,#000000)] bg-[var(--primary)] text-[var(--on-primary)] shadow-[0_1px_0_color-mix(in_srgb,var(--on-primary)_6%,transparent)]">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="shrink-0">
            <Link
              href={ROUTES.home}
              className="block whitespace-nowrap text-3xl font-extrabold tracking-tight text-[var(--on-primary)] transition hover:brightness-110"
            >
              Jigsaw
            </Link>
          </div>
          <nav className="flex shrink-0 items-center justify-end gap-2 text-sm">
            {!sessionQuery.data ? (
              <Link
                href={ROUTES.play}
                className="inline-flex h-9 items-center rounded-md px-2.5 text-sm text-[var(--on-primary)]/90 underline-offset-4 transition hover:text-[var(--on-primary)] hover:underline"
              >
                학생 입장
              </Link>
            ) : null}
            {sessionQuery.data ? (
              <Button
                variant="transparent"
                size="sm"
                onClick={() => signOutMutation.mutate()}
                disabled={signOutMutation.isPending}
              >
                로그아웃
              </Button>
            ) : (
              <ButtonLink
                href={ROUTES.login}
                variant="transparent"
                size="sm"
                className="max-sm:hidden"
              >
                교사 로그인
              </ButtonLink>
            )}
          </nav>
        </div>
      </header>
      {showTeacherSubNav(pathname) ? <TeacherSubNav /> : null}
    </>
  );
}
