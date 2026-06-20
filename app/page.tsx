"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Puzzle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ACTIVITY_LAYOUT_MAX } from "@/components/activity/activity-layout-chrome";
import { TopNav } from "@/components/layout/top-nav";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/api/auth";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth/use-require-teacher-session";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const FEATURE_ICONS = [Sparkles, Puzzle, ClipboardList] as const;

const bulletClass =
  "group flex flex-col items-center gap-3.5 rounded-2xl border border-[color-mix(in_srgb,var(--primary)_14%,var(--border))] bg-[var(--surface)] px-5 py-6 text-center shadow-[var(--elevation-sm)] ring-1 ring-[color-mix(in_srgb,var(--primary)_8%,transparent)] transition duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] hover:shadow-[var(--elevation-md)] sm:items-start sm:gap-4 sm:px-5 sm:py-7 sm:text-left";

const LANDING_EYEBROW = "AI 기반의 스마트한 Jigsaw & STAD 협동학습 플랫폼";
const LANDING_TAGLINE = "번거로운 협동학습 수업 설계는 그만! 학생 자동 모둠 배정부터 전문가 학습, 개별 퀴즈 채점, 향상 점수 계산까지 한 번에 해결하세요.";
const LANDING_RESEARCH_TITLE = "중·고등학교 협동학습을 위해 최적화된 직소(Jigsaw) 및 STAD 모형 온라인 교육 플랫폼, Zigso";
const LANDING_FEATURES = [
  {
    title: "AI 기반의 1초 활동 생성",
    body: "주제와 대상 학년만 입력하면, AI가 협동학습에 필요한 역할별 핵심 지문과 연습 문제, 실전 퀴즈까지 자동으로 완성해 줍니다.",
  },
  {
    title: "상호의존성 & 개별책무성 설계",
    body: "모두가 가르치고 배우는 직소(Jigsaw) 모형과 개인의 노력이 모둠의 성공으로 이어지는 STAD 향상 점수 제도를 온라인으로 자연스럽게 결합했습니다.",
  },
  {
    title: "과정 중심 실시간 리포트",
    body: "학생들의 진행 상황, 퀴즈 제출 이력, 오답률을 실시간 대시보드로 모니터링하여 개별 맞춤형 피드백과 과정 중심 평가를 제공합니다.",
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
                Zigso
              </h1>

              <p className="mx-auto mt-4 max-w-md text-balance text-base font-medium leading-snug text-[var(--foreground)] sm:mt-5 sm:text-lg sm:leading-snug">
                {LANDING_TAGLINE}
              </p>

              <p className="mx-auto mt-3 max-w-lg text-balance text-sm leading-relaxed text-[color-mix(in_srgb,var(--muted-foreground)_92%,var(--mystery))] sm:text-base">
                {LANDING_RESEARCH_TITLE}
              </p>
            </header>

            <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
              <ButtonLink
                href={ROUTES.login}
                variant="default"
                size="lg"
                className="w-full sm:w-auto sm:min-w-[13.5rem]"
              >
                지금 시작하기
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
