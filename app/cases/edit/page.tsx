"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { TopNav } from "@/components/layout/top-nav";
import { LoadingState } from "@/components/ui/loading-state";
import { getLesson, parseScenarioPack } from "@/lib/api/lessons";
import { ROUTES } from "@/lib/routes";

import { ScenarioSteps } from "../scenario-steps";

export default function LessonEditPage() {
  return (
    <Suspense
      fallback={
        <div className="app-page flex min-h-dvh flex-col">
          <TopNav />
          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8">
            <LoadingState variant="page" />
          </main>
        </div>
      }
    >
      <LessonEditContent />
    </Suspense>
  );
}

function LessonEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("case") ?? searchParams.get("lesson");

  useEffect(() => {
    if (!lessonId) router.replace(ROUTES.cases);
  }, [lessonId, router]);

  const dataQuery = useQuery({
    queryKey: ["teacher-lesson-edit", lessonId],
    queryFn: () => getLesson(lessonId!),
    enabled: Boolean(lessonId),
  });

  if (!lessonId) return null;

  if (dataQuery.isLoading) {
    return (
      <div className="app-page flex min-h-dvh flex-col">
        <TopNav />
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8">
          <LoadingState variant="page" />
        </main>
      </div>
    );
  }

  if (dataQuery.isError) {
    return (
      <div className="app-page flex min-h-dvh flex-col">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
          <p className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            수업을 불러오지 못했습니다: {(dataQuery.error as Error).message}
          </p>
        </main>
      </div>
    );
  }

  const scenarioPack = parseScenarioPack(dataQuery.data?.scenario_pack);
  if (!scenarioPack) {
    return (
      <div className="app-page flex min-h-dvh flex-col">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
          <p className="rounded-md border border-[var(--panel-warn-border)] bg-[var(--panel-warn-bg)] px-3 py-2 text-sm text-[var(--foreground)]">
            이 수업에는 급식 시나리오가 없습니다. 새 수업으로 다시 만들어 주세요.
          </p>
        </main>
      </div>
    );
  }

  return (
    <ScenarioSteps mode="edit" lessonId={lessonId} initialPack={scenarioPack} pageTitle="수업 수정" />
  );
}
