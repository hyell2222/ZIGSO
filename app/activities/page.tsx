"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Loader2, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteActivity,
  listActivities,
  startSession,
  type ActivityListRow,
} from "@/lib/api/activities";
import { useRequireTeacherSession } from "@/lib/auth/use-require-teacher-session";
import { KebabMenu } from "@/components/ui/kebab-menu";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

export default function ActivitiesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const sessionQuery = useRequireTeacherSession();

  const activitiesQuery = useQuery({
    queryKey: ["teacher-activities", sessionQuery.data?.user.id],
    queryFn: () => listActivities(sessionQuery.data!.user.id),
    enabled: Boolean(sessionQuery.data?.user.id),
  });

  const startGameMutation = useMutation({
    mutationFn: async ({
      activityRow,
    }: {
      activityRow: ActivityListRow;
      newTab: Window | null;
    }) => startSession(activityRow, sessionQuery.data?.user.id),
    onMutate: () => setErrorMessage(null),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["host-sessions"] });
      const url = ROUTES.sessionHost(data.sessionId);
      if (variables.newTab && !variables.newTab.closed) {
        variables.newTab.location.href = url;
      } else {
        router.push(url);
      }
    },
    onError: (error: Error, variables) => {
      if (variables?.newTab && !variables.newTab.closed) {
        variables.newTab.close();
      }
      setErrorMessage(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (activityId: string) => {
      setPendingDeleteId(activityId);
      try {
        await deleteActivity(activityId);
      } finally {
        setPendingDeleteId(null);
      }
    },
    onMutate: () => setErrorMessage(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teacher-activities"] });
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const handleStartGame = (activityRow: ActivityListRow) => {
    const newTab = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;
    startGameMutation.mutate({ activityRow, newTab });
  };

  const handleSandbox = (activityRow: ActivityListRow) => {
    if (typeof window === "undefined") return;
    const url = ROUTES.activitiesSandbox(activityRow.id);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleEdit = (row: ActivityListRow) => {
    router.push(ROUTES.activitiesEdit(row.id));
  };

  const handleDelete = (row: ActivityListRow) => {
    const title = row.title?.trim() || "제목 없는 활동";
    if (
      !window.confirm(
        `"${title}" 활동을 삭제할까요?\n연결된 세션·진행 데이터도 모두 함께 삭제됩니다.`,
      )
    ) {
      return;
    }
    deleteMutation.mutate(row.id);
  };

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
        {sessionQuery.data ? (
          <div className="space-y-6">
            <PageHeader
              title="내 활동"
              description="활동을 만든 뒤 세션을 시작하면 학생이 참가 코드로 입장합니다."
              actions={
                (activitiesQuery.data?.length ?? 0) > 0 ? (
                  <Button
                    type="button"
                    onClick={() => router.push(ROUTES.activitiesNew)}
                    className="flex items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    새 활동 만들기
                  </Button>
                ) : null
              }
            />
            {activitiesQuery.isLoading ? (
              <LoadingState variant="section" label="불러오는 중…" />
            ) : (activitiesQuery.data?.length ?? 0) === 0 ? (
              <div className="flex justify-center py-10">
                <Button type="button" onClick={() => router.push(ROUTES.activitiesNew)} className="flex items-center gap-2">
                  <PlusIcon className="h-4 w-4" />새 활동 만들기
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {activitiesQuery.data?.map((row) => {
                  const isDeleting = pendingDeleteId === row.id;
                  return (
                    <div
                      key={row.id}
                      className="relative space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-[var(--elevation-sm)] transition hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:shadow-[var(--elevation-md)]"
                    >
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 font-semibold text-[var(--foreground)]">
                          {row.title ?? "제목 없는 활동"}
                        </p>
                        <div className="ml-auto shrink-0">
                          <KebabMenu
                            disabled={isDeleting}
                            onEdit={() => handleEdit(row)}
                            onDelete={() => handleDelete(row)}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] pb-2">
                        모둠 당 {row.group_size ?? "—"}명 · 미션 {row.task_count ?? "—"}개
                      </p>
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          onClick={() => handleStartGame(row)}
                          disabled={
                            startGameMutation.isPending ||
                            isDeleting ||
                            !sessionQuery.data?.user.id
                          }
                        >
                          {startGameMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-[var(--primary)]" aria-hidden />
                              플레이 시작하는 중…
                            </>
                          ) : (
                            "플레이 시작"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleSandbox(row)}
                          disabled={isDeleting}
                          className="gap-2"
                        >
                          <FlaskConical className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                          시뮬레이션 모드
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {errorMessage ? (
              <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
