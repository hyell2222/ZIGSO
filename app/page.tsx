"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Puzzle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { TopNav } from "@/components/layout/top-nav";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/api/auth";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth-session-query";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

const bulletClass =
  "group flex flex-col items-center gap-3.5 rounded-2xl border border-[color-mix(in_srgb,var(--border)_88%,transparent)] bg-[color-mix(in_srgb,var(--surface)_82%,var(--background))] px-5 py-6 text-center shadow-[var(--elevation-sm)] ring-1 ring-[color-mix(in_srgb,var(--on-primary)_55%,transparent)] transition duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] hover:shadow-[0_12px_36px_color-mix(in_srgb,var(--mystery)_9%,transparent)] sm:items-start sm:gap-4 sm:px-5 sm:py-7 sm:text-left";

export default function HomePage() {
  const router = useRouter();

  const sessionQuery = useQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      return getCurrentSession();
    },
  });

  useEffect(() => {
    if (sessionQuery.isLoading) return;
    if (sessionQuery.isFetching && !sessionQuery.data) return;
    if (sessionQuery.data) router.replace(ROUTES.cases);
  }, [router, sessionQuery.data, sessionQuery.isLoading, sessionQuery.isFetching]);

  return (
    <>
      <TopNav />
      <main className="min-h-[calc(100dvh-3.75rem)]">
        <div className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[var(--background)]"
            style={{
              backgroundImage: `
            radial-gradient(ellipse 90% 55% at 50% -18%, color-mix(in srgb, var(--primary) 10%, transparent), transparent 62%),
            radial-gradient(ellipse 70% 45% at 85% 85%, color-mix(in srgb, var(--highlight) 7%, transparent), transparent 55%),
            radial-gradient(ellipse 60% 40% at 10% 70%, color-mix(in srgb, var(--accent) 9%, transparent), transparent 50%),
            linear-gradient(175deg, color-mix(in srgb, var(--surface) 92%, var(--background)) 0%, var(--background) 38%, var(--background) 100%)
          `,
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[color-mix(in_srgb,var(--ink)_4%,transparent)] to-transparent"
            aria-hidden
          />

          <div className="mx-auto w-full max-w-4xl px-5 py-14 text-center sm:px-6 sm:py-20 md:px-8 md:py-24">
            <div className="flex flex-col items-center justify-center gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2.5 text-[var(--accent)] sm:gap-3.5">
                <span className="h-px w-8 max-sm:w-5 bg-[color-mix(in_srgb,var(--accent)_45%,transparent)]" aria-hidden />
                <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[color-mix(in_srgb,var(--accent)_92%,var(--mystery))]">
                  급식실 협동 영어 타이쿤
                </p>
                <span className="h-px w-8 max-sm:w-5 bg-[color-mix(in_srgb,var(--accent)_45%,transparent)]" aria-hidden />
              </div>
              <h1 className="bg-[linear-gradient(165deg,var(--primary)_0%,color-mix(in_srgb,var(--primary)_72%,var(--mystery))_100%)] bg-clip-text text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-transparent drop-shadow-[0_1px_0_color-mix(in_srgb,var(--on-primary)_35%,transparent)] sm:text-6xl sm:tracking-[-0.03em]">
                School Lunch Rush
              </h1>
            </div>
            <p className="mx-auto mt-4 max-w-xl text-balance text-base leading-relaxed text-[color-mix(in_srgb,var(--muted-foreground)_94%,var(--mystery))] sm:mt-5 md:mt-6 md:text-[1.05rem] md:leading-[1.65]">
              조별로 급식실 직원이 되어 영어로 재료를 추리하고, 오늘의 급식판을 완성하는 협동 학습 게임
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
              <ButtonLink href={ROUTES.login} variant="default" size="lg">
                지금 시작하기
              </ButtonLink>
              <ButtonLink href={ROUTES.play} variant="outline" size="lg">
                학생으로 참가하기
              </ButtonLink>
            </div>

            <ul className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-5 md:mt-14 md:gap-x-6">
              <li className={bulletClass}>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,var(--tint-accent-weak))] text-[var(--primary)] shadow-[inset_var(--input-inset)] transition group-hover:bg-[color-mix(in_srgb,var(--primary)_14%,var(--tint-accent-weak))]">
                  <Sparkles className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[color-mix(in_srgb,var(--mystery)_94%,var(--primary))]">
                    AI 급식 시나리오 생성
                  </p>
                  <p className="mt-2 text-xs break-keep leading-snug text-[color-mix(in_srgb,var(--muted-foreground)_96%,var(--accent))]">
                    주제·난이도·팀 인원만 입력하면 메뉴·재료·5단계 힌트·조리 순서를 자동 생성해요.
                  </p>
                </div>
              </li>
              <li className={bulletClass}>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--tint-mystery)] text-[color-mix(in_srgb,var(--mystery)_92%,var(--primary))] shadow-[inset_var(--input-inset)] transition group-hover:bg-[color-mix(in_srgb,var(--mystery)_12%,var(--surface))]">
                  <Puzzle className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[color-mix(in_srgb,var(--mystery)_94%,var(--primary))]">
                    직소·STAD 협동 학습
                  </p>
                  <p className="mt-2 text-xs break-keep leading-snug text-[color-mix(in_srgb,var(--muted-foreground)_96%,var(--accent))]">
                    재료 전문가 집단에서 영어 힌트로 재료를 추리하고, 조로 돌아와 급식판을 완성해요.
                  </p>
                </div>
              </li>
              <li className={bulletClass}>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--highlight)_12%,var(--tint-accent))] text-[color-mix(in_srgb,var(--highlight)_58%,var(--mystery))] shadow-[inset_var(--input-inset)] transition group-hover:bg-[color-mix(in_srgb,var(--highlight)_16%,var(--tint-accent))]">
                  <ClipboardList className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[color-mix(in_srgb,var(--mystery)_94%,var(--primary))]">
                    영어 명령문 조리·급식판 제출
                  </p>
                  <p className="mt-2 text-xs break-keep leading-snug text-[color-mix(in_srgb,var(--muted-foreground)_96%,var(--accent))]">
                    획득한 재료로 실제 급식 메뉴를 만들고, 영어 명령문 카드를 조합해 제출해요.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}
