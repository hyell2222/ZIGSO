"use client";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Sparkles, Puzzle, Monitor, GraduationCap, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { TopNav } from "@/components/layout/top-nav";
import { Button, ButtonLink } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/api/auth";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth/use-require-teacher-session";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const LANDING_EYEBROW = "직소(Jigsaw) 협동학습 모형의 디지털 전환";
const LANDING_TAGLINE = "번거롭고 복잡했던 오프라인 직소 수업을 온라인으로 완벽하게 구현하다.";
const LANDING_DESCRIPTION = "학생 조 편성부터 AI 비계 기반 전문가 학습, 실시간 진행 제어, 그리고 STAD 향상 점수 산출까지 하나의 플랫폼에서 해결하세요.";
const LANDING_RESEARCH_TITLE = "중·고등학교 교실 수업의 협동과 성장을 위해 설계된 온라인 교육용 소프트웨어, ZIGSO";

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
    <div className="flex min-h-dvh flex-col bg-[var(--background)] font-sans">
      <TopNav />

      <main className="flex-1 flex flex-col justify-center py-12 sm:py-16 md:py-20 px-4 max-w-5xl mx-auto w-full">

        {/* 히어로 헤더 */}
        <header className="space-y-6 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--tint-primary-weak)] border border-[var(--primary)]/10">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
            <p className="text-[11px] font-bold tracking-wider text-[var(--primary)] uppercase sm:text-xs">
              {LANDING_EYEBROW}
            </p>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--ink)]">
              ZIGSO
            </h1>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--muted-foreground)] leading-snug">
              {LANDING_TAGLINE}
            </h2>
          </div>

          <p className="mx-auto text-base sm:text-lg leading-relaxed text-[var(--muted-foreground)] font-medium max-w-3xl">
            {LANDING_DESCRIPTION}
          </p>

          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--accent)]">
            🎓 {LANDING_RESEARCH_TITLE}
          </div>

          {/* 시작 버튼: 작게 & 중앙 정렬 */}
          <div className="pt-2">
            <Button onClick={() => router.push(ROUTES.login)}>
              지금 바로 시작하기
            </Button>
          </div>
        </header>

        {/* 핵심 3대 디지털 메커니즘 피쳐 목록 */}
        <section className="mt-16 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* 피쳐 1 */}
            <div className="border border-[var(--border)] bg-[var(--surface)] p-6 rounded-xl space-y-4 hover:border-[var(--primary)]/30 transition-colors shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--tint-primary-weak)] text-[var(--primary)]">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h4 className="font-extrabold text-base text-[var(--ink)]">
                  1. 수업 행정 디지털화 (수업 효율성)
                </h4>
                <p className="text-xs sm:text-sm leading-relaxed text-[var(--muted-foreground)]">
                  지문 복사/인쇄, 모둠 교대 자리 배치 등의 번거로운 행정을 없애고, 교사용 원클릭 제어판으로 알짜 학습 시간을 100% 보존합니다.
                </p>
              </div>
            </div>

            {/* 피쳐 2 */}
            <div className="border border-[var(--border)] bg-[var(--surface)] p-6 rounded-xl space-y-4 hover:border-[var(--info)]/30 transition-colors shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--info)_12%,var(--surface))] text-[var(--info)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h4 className="font-extrabold text-base text-[var(--ink)]">
                  2. 전문가 과정 디지털화 (AI 비계)
                </h4>
                <p className="text-xs sm:text-sm leading-relaxed text-[var(--muted-foreground)]">
                  연습문제 오답 횟수에 따라 1차/2차 AI 힌트와 상세 해설을 단계별로 제공하여, 교사 개입 없이 학생 스스로 자기교정 및 완전학습을 지원합니다.
                </p>
              </div>
            </div>

            {/* 피쳐 3 */}
            <div className="border border-[var(--border)] bg-[var(--surface)] p-6 rounded-xl space-y-4 hover:border-[var(--highlight)]/30 transition-colors shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--tint-highlight-weak)] text-[var(--highlight)]">
                <Puzzle className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h4 className="font-extrabold text-base text-[var(--ink)]">
                  3. 무임승차 방지 및 STAD 보상
                </h4>
                <p className="text-xs sm:text-sm leading-relaxed text-[var(--muted-foreground)]">
                  동료들의 퀴즈 제출 현황을 완료 불빛으로 시각화하여 무임승차를 방지하고, 향상도 평균 기반의 최종 모둠 순위 발표로 협동을 자극합니다.
                </p>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* 필수 연구 규격 권장사양 푸터 */}
      <footer className="w-full border-t border-[var(--border)] bg-[var(--surface)] py-6 text-center text-xs text-[var(--muted-foreground)] px-4 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-medium">
            <span className="inline-flex items-center gap-1">
              <GraduationCap className="h-4 w-4" />
              대상 학년: 중·고교 전 학년 수업용
            </span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span className="inline-flex items-center gap-1">
              <Monitor className="h-4 w-4" />
              해상도: 1920x1080 권장 (반응형 지원)
            </span>
          </div>
          <p className="text-[11px] opacity-75">
            권장 환경: Chrome, Edge 등 최신 브라우저
          </p>
        </div>
      </footer>
    </div>
  );
}
