"use client";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Sparkles, Puzzle, Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/api/auth";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth/use-require-teacher-session";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

const LANDING_EYEBROW = "모두가 주인공이 되는 디지털 협동학습";
const LANDING_TAGLINE = "AI 기반 직소·STAD 협동학습 플랫폼 Zigso의 개발 및 수업 적용";

export default function HomePage() {
  const navigate = useNavigate();

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
    if (sessionQuery.data) navigate(ROUTES.activities, { replace: true });
  }, [navigate, sessionQuery.data, sessionQuery.isLoading, sessionQuery.isFetching]);

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)] font-sans">
      <TopNav />

      <main className="flex-1 flex flex-col justify-center py-12 sm:py-16 md:py-20 px-4 max-w-5xl mx-auto w-full">

        {/* 히어로 헤더 */}
        <header className="space-y-6 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--tint-primary-weak)] border border-[var(--primary)]/10">
            <p className="text-[11px] font-bold tracking-wider text-[var(--primary)] uppercase sm:text-xs">
              {LANDING_EYEBROW}
            </p>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--ink)]">
              Zigso
            </h1>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--muted-foreground)] leading-snug">
              {LANDING_TAGLINE}
            </h2>
          </div>

          {/* 시작 버튼: 작게 & 중앙 정렬 */}
          <div className="pt-2">
            <Button onClick={() => navigate(ROUTES.login)}>
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
              <div className="space-y-3">
                <h4 className="font-extrabold text-lg text-[var(--ink)]">
                  클릭 한 번으로 끝나는
                  <br />
                  모둠 수업 자동화
                </h4>
                <p className="text-xs sm:text-sm text-[var(--muted-foreground)] break-keep (word-break: keep-all)">
                  자료 배부부터 모둠 편성, 자동 채점 및 실시간 진행 상황 확인까지 복잡한 모둠 수업 관리를 디지털로 단번에 해결하세요.
                </p>
              </div>
            </div>

            {/* 피쳐 2 */}
            <div className="border border-[var(--border)] bg-[var(--surface)] p-6 rounded-xl space-y-4 hover:border-[var(--info)]/30 transition-colors shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--info)_12%,var(--surface))] text-[var(--info)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-3">
                <h4 className="font-extrabold text-lg text-[var(--ink)]">
                  AI가 도와주는
                  <br />
                  개별 맞춤형 완전학습
                </h4>
                <p className="text-xs sm:text-sm text-[var(--muted-foreground)] break-keep (word-break: keep-all)">
                  실시간 단계별 맞춤 힌트와 상세 해설을 통해, 모든 학생이 포기하지 않고 스스로 개념을 완벽히 이해하도록 지원합니다.
                </p>
              </div>
            </div>

            {/* 피쳐 3 */}
            <div className="border border-[var(--border)] bg-[var(--surface)] p-6 rounded-xl space-y-4 hover:border-[var(--highlight)]/30 transition-colors shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--tint-highlight-weak)] text-[var(--highlight)]">
                <Puzzle className="h-5 w-5" />
              </div>
              <div className="space-y-3">
                <h4 className="font-extrabold text-lg text-[var(--ink)]">
                  참여는 확실하게,
                  <br />
                  협동심은 단단하게
                </h4>
                <p className="text-xs sm:text-sm text-[var(--muted-foreground)] break-keep (word-break: keep-all)">
                  실시간 제출 현황 시각화로 소외되는 학생을 방지하고, 개인의 향상도 점수를 모둠 평균에 반영하여 연대감과 협동을 이끌어냅니다.
                </p>
              </div>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
