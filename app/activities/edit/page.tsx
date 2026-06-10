"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { TopNav } from "@/components/layout/top-nav";
import { LoadingState } from "@/components/ui/loading-state";
import { getActivity, parseActivityPack } from "@/lib/api/activities";
import { ROUTES } from "@/lib/routes";

import { ActivitySteps } from "../activity-steps";

export default function ActivityEditPage() {
  return (
    <Suspense
      fallback={
        <div className="app-page">
          <TopNav />
          <LoadingState variant="page" className="min-h-0 flex-1" />
        </div>
      }
    >
      <ActivityEditContent />
    </Suspense>
  );
}

function ActivityEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activityId = searchParams.get("activity");

  useEffect(() => {
    if (!activityId) router.replace(ROUTES.activities);
  }, [activityId, router]);

  const dataQuery = useQuery({
    queryKey: ["teacher-activity-edit", activityId],
    queryFn: () => getActivity(activityId!),
    enabled: Boolean(activityId),
  });

  if (!activityId) return null;

  if (dataQuery.isLoading) {
    return (
      <div className="app-page">
        <TopNav />
        <LoadingState variant="page" className="min-h-0 flex-1" />
      </div>
    );
  }

  if (dataQuery.isError) {
    return (
      <div className="app-page flex min-h-dvh flex-col">
        <TopNav />
        <main className="flex flex-col items-center justify-center mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          <p className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            활동을 불러오지 못했습니다: {(dataQuery.error as Error).message}
          </p>
        </main>
      </div>
    );
  }

  const activityPack = parseActivityPack(dataQuery.data?.activity_pack);
  if (!activityPack) {
    return (
      <div className="app-page flex min-h-dvh flex-col">
        <TopNav />
        <main className="flex flex-col items-center justify-center mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          <p className="rounded-md border border-[var(--panel-warn-border)] bg-[var(--panel-warn-bg)] px-3 py-2 text-sm text-[var(--foreground)]">
            이 활동에는 활동 팩이 없습니다. 새 활동으로 다시 만들어 주세요.
          </p>
        </main>
      </div>
    );
  }

  return (
    <ActivitySteps mode="edit" activityId={activityId} initialPack={activityPack} pageTitle="활동 수정" />
  );
}
