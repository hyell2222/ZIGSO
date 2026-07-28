"use client";
import { useQuery } from "@tanstack/react-query";
import {
  Globe,
  Users,
  Puzzle,
  Radio,
  Sparkles,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/api/auth";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth/use-require-teacher-session";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

const FEATURES = [
  {
    icon: Globe,
    title: "웹 기반 학습 환경",
    description:
      "별도의 프로그램 설치 없이 다양한 기기에서 웹 브라우저만으로 언제 어디서나 수업을 시작할 수 있습니다.",
  },
  {
    icon: Users,
    title: "자동 모둠 편성",
    description:
      "참가한 학생 수에 맞춰 모둠과 전문가 역할을 자동으로 편성하여 수업 준비 시간을 줄여 줍니다.",
  },
  {
    icon: Puzzle,
    title: "직소 협동학습 운영",
    description:
      "전문가 학습부터 홈 모둠 협동학습, 개별 형성평가까지 직소(Jigsaw II) 협동학습의 전 과정을 하나의 플랫폼에서 운영할 수 있습니다.",
  },
  {
    icon: Radio,
    title: "실시간 수업 관리",
    description:
      "교사의 단계 전환에 따라 모든 학생 화면이 자동으로 전환되며, 학생별 학습 진행 상황을 실시간으로 확인할 수 있습니다.",
  },
  {
    icon: Sparkles,
    title: "AI 맞춤형 피드백",
    description:
      "학생의 오답에 맞는 단계별 AI 힌트와 최종 AI 해설을 제공하여 스스로 학습할 수 있도록 돕습니다.",
  },
  {
    icon: TrendingUp,
    title: "STAD 성장 평가",
    description:
      "기준 점수와 향상 점수를 자동으로 산출하여 개인의 성장과 모둠의 협력 성과를 함께 확인할 수 있습니다.",
  },
  {
    icon: ClipboardList,
    title: "학습 결과 관리",
    description:
      "학습 결과와 참여 기록을 자동으로 저장하고 활동 리포트로 제공하여 학생의 학습 과정을 효과적으로 관리할 수 있습니다.",
  },
];

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

      <main className="flex-1 flex flex-col justify-center py-10 sm:py-14 px-4 max-w-5xl mx-auto w-full">
        {/* 히어로 헤더 */}
        <header className="space-y-6 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--tint-primary-weak)] border border-[var(--primary)]/10">
            <p className="text-xs font-bold tracking-wider text-[var(--primary)] uppercase sm:text-sm">
              고등학교 (2학년) 대상
            </p>
          </div>

          <div className="space-y-6">
            <h1 className="text-3xl sm:text-4xl leading-snug font-extrabold tracking-tight text-[var(--ink)]">
              AI 기반 맞춤형 협동학습 플랫폼(ZIGSO)
              <br />
              개발 및 수업 적용
            </h1>
          </div>

          {/* 시작 버튼: 작게 & 중앙 정렬 */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button onClick={() => navigate(ROUTES.login)}>
              지금 바로 시작하기
            </Button>
            <Button variant="outline" onClick={() => navigate(ROUTES.play)}>
              학생으로 입장하기
            </Button>
          </div>
        </header>

        {/* 주요 기능 피쳐 목록 (4 + 3 두 줄 중앙정렬) */}
        <section className="mt-12 sm:mt-16 space-y-4">
          {/* 첫 번째 줄: 4개 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.slice(0, 4).map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="border border-[var(--border)] bg-[var(--surface)] p-4 rounded-xl space-y-2 hover:border-[var(--primary)]/40 hover:shadow-sm transition-all flex flex-col justify-start"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--tint-primary-weak)] text-[var(--primary)]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-[var(--ink)]">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed break-keep">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* 두 번째 줄: 3개 중앙 정렬 */}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {FEATURES.slice(4).map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="border border-[var(--border)] bg-[var(--surface)] p-4 rounded-xl space-y-2 hover:border-[var(--primary)]/40 hover:shadow-sm transition-all flex flex-col justify-start w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--tint-primary-weak)] text-[var(--primary)]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-[var(--ink)]">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed break-keep">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
