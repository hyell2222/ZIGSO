"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Puzzle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ACTIVITY_LAYOUT_MAX } from "@/components/activity/activity-layout-chrome";
import { TopNav } from "@/components/layout/top-nav";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/api/auth";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth-session-query";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const FEATURE_ICONS = [Sparkles, Puzzle, ClipboardList] as const;

const bulletClass =
  "group flex flex-col items-center gap-3.5 rounded-2xl border border-[color-mix(in_srgb,var(--primary)_14%,var(--border))] bg-[var(--surface)] px-5 py-6 text-center shadow-[var(--elevation-sm)] ring-1 ring-[color-mix(in_srgb,var(--primary)_8%,transparent)] transition duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] hover:shadow-[var(--elevation-md)] sm:items-start sm:gap-4 sm:px-5 sm:py-7 sm:text-left";

const LANDING_EYEBROW = "직소 모형 기반 온라인 협동학습 게임";
const LANDING_TAGLINE = "복잡한 직소 활동 설계는 그만! 학생 랜덤 배정부터 점수 계산까지 알아서 해드립니다";
const LANDING_RESEARCH_TITLE = "중·고 협동학습 수업을 위한 직소·STAD 온라인 활동 플랫폼 Jigsaw 개발 및 적용"
const LANDING_FEATURES = [
  {
    title: "AI로 활동 생성",
    body: "AI가 활동에 필요한 콘텐츠를 자동 완성해줍니다.",
  },
  {
    title: "상호의존성 및 책무성 극대화",
    body: "직소 및 STAD 협동학습 이론을 실제로 구현헤 자동 운영이 가능하합니다.",
  },
  {
    title: "과정중심 학습 지원",
    body: "실시간 동시 참여, 스캐폴딩, 활동 리포트로 과정 중심 학습 및 평가를 지원합니다.",
  },
] as const;

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
    if (sessionQuery.data) router.replace(ROUTES.activities);
  }, [router, sessionQuery.data, sessionQuery.isLoading, sessionQuery.isFetching]);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopNav />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="relative flex min-h-full flex-1 flex-col">
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

          <div
            className={cn(
              "mx-auto flex w-full flex-1 flex-col justify-center",
              ACTIVITY_LAYOUT_MAX,
              "px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] pt-8 text-center sm:px-6 sm:py-12 md:px-8 md:py-14",
            )}
          >
            <header className="flex flex-col items-center">
              <div className="flex items-center gap-2.5 text-[var(--accent)] sm:gap-3.5">
                <span className="h-px w-8 max-sm:w-5 bg-[color-mix(in_srgb,var(--accent)_45%,transparent)]" aria-hidden />
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[color-mix(in_srgb,var(--accent)_92%,var(--mystery))]">
                  {LANDING_EYEBROW}
                </p>
                <span className="h-px w-8 max-sm:w-5 bg-[color-mix(in_srgb,var(--accent)_45%,transparent)]" aria-hidden />
              </div>

              <h1 className="mt-2.5 bg-[linear-gradient(165deg,var(--primary)_0%,color-mix(in_srgb,var(--primary)_72%,var(--mystery))_100%)] bg-clip-text text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-transparent drop-shadow-[0_1px_0_color-mix(in_srgb,var(--on-primary)_35%,transparent)] sm:mt-3 sm:text-6xl sm:tracking-[-0.03em]">
                Jigsaw
              </h1>

              <p className="mx-auto mt-4 max-w-md text-balance text-base font-medium leading-snug text-[var(--foreground)] sm:mt-5 sm:text-lg sm:leading-snug">
                {LANDING_TAGLINE}
              </p>

              <p className="mx-auto mt-3 max-w-lg text-balance text-sm leading-relaxed text-[color-mix(in_srgb,var(--muted-foreground)_92%,var(--mystery))] sm:text-base">
                {LANDING_RESEARCH_TITLE}
              </p>
            </header>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
              <ButtonLink href={ROUTES.login} variant="default" size="lg">
                교사로 시작하기
              </ButtonLink>
              <ButtonLink href={ROUTES.play} variant="outline" size="lg">
                학생으로 입장하기
              </ButtonLink>
            </div>

            <ul className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-5 md:mt-14">
              {LANDING_FEATURES.map((feature, index) => {
                const Icon = FEATURE_ICONS[index] ?? Sparkles;
                const iconWrap =
                  index === 0
                    ? "bg-[var(--tint-primary-weak)] text-[var(--primary)] group-hover:bg-[var(--tint-primary)]"
                    : index === 1
                      ? "bg-[color-mix(in_srgb,var(--info)_12%,var(--surface))] text-[var(--info)] group-hover:bg-[color-mix(in_srgb,var(--info)_18%,var(--surface))]"
                      : "bg-[var(--tint-highlight-weak)] text-[var(--highlight)] group-hover:bg-[var(--tint-highlight)]";

                return (
                  <li key={feature.title} className={bulletClass}>
                    <span
                      className={cn(
                        "inline-flex h-11 w-11 items-center justify-center rounded-xl shadow-[inset_var(--input-inset)] transition",
                        iconWrap,
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[color-mix(in_srgb,var(--mystery)_94%,var(--primary))]">
                        {feature.title}
                      </p>
                      <p className="mt-1.5 text-xs leading-snug text-[color-mix(in_srgb,var(--muted-foreground)_96%,var(--accent))]">
                        {feature.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
