"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ROUTES } from "@/lib/routes";

export default function ActivitiesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteRow, setPendingDeleteRow] = useState<ActivityListRow | null>(null);

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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teacher-activities"] });
    },
    onError: (error: Error) => toast.error(error.message),
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

  const openEditorTab = (url: string) => {
    if (typeof window === "undefined") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleNewActivity = () => {
    openEditorTab(ROUTES.activitiesNew);
  };

  const handleEdit = (row: ActivityListRow) => {
    openEditorTab(ROUTES.activitiesEdit(row.id));
  };

  const handleDelete = (row: ActivityListRow) => {
    setPendingDeleteRow(row);
  };

  const pendingDeleteTitle = pendingDeleteRow?.title?.trim() || "제목 없는 활동";

  return (
    <div className="min-h-screen">
      <TopNav />
      <ConfirmModal
        open={pendingDeleteRow !== null}
        title="활동 삭제"
        onClose={() => setPendingDeleteRow(null)}
        onConfirm={() => {
          if (!pendingDeleteRow) return;
          deleteMutation.mutate(pendingDeleteRow.id);
          setPendingDeleteRow(null);
        }}
      >
        <p>「{pendingDeleteTitle}」 활동을 삭제할까요?</p>
        <p>연결된 활동 기록·진행 데이터도 함께 삭제되며 되돌릴 수 없습니다.</p>
      </ConfirmModal>
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
        {sessionQuery.data ? (
          <div className="space-y-6">
            <PageHeader
              title="내 활동"
              actions={
                (activitiesQuery.data?.length ?? 0) > 0 ? (
                  <Button
                    type="button"
                    onClick={handleNewActivity}
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
                <Button type="button" onClick={handleNewActivity} className="flex items-center gap-2">
                  <PlusIcon className="h-4 w-4" />
                  새 활동 만들기
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {activitiesQuery.data?.map((row: ActivityListRow) => {
                  const isDeleting = pendingDeleteId === row.id;
                  return (
                    <div key={row.id}>
                      <div
                        className="relative space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left shadow-[var(--elevation-sm)] transition hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:shadow-[var(--elevation-md)]"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col gap-2">
                            <p className="min-w-0 flex-1 text-lg font-semibold text-[var(--foreground)]">
                              {row.title ?? "제목 없는 활동"}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              모둠 당 최소 필요 인원 : {row.activity_pack?.roles?.length ?? "—"}명
                            </p>
                          </div>

                          <div className="flex justify-end gap-2">
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
                                  시작하는 중…
                                </>
                              ) : (
                                "시작하기"
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => handleSandbox(row)}
                              disabled={isDeleting}
                              className="gap-2"
                            >
                              시뮬레이션
                            </Button>

                            <div className="ml-auto shrink-0 flex flex-col justify-center">
                              <KebabMenu
                                disabled={isDeleting}
                                onEdit={() => handleEdit(row)}
                                onDelete={() => handleDelete(row)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
