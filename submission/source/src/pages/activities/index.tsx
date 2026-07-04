"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PlusIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "오후" : "오전";
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12

    return `${yyyy}.${mm}.${dd}. ${ampm} ${hours}:${minutes}`;
  } catch (e) {
    return "—";
  }
}

export default function ActivitiesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteRow, setPendingDeleteRow] = useState<ActivityListRow | null>(null);

  const sessionQuery = useRequireTeacherSession();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleWindowMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.action === "saved") {
        void queryClient.invalidateQueries({ queryKey: ["teacher-activities", sessionQuery.data?.user?.id] });
        toast.success(event.data.message || "활동이 저장되었습니다.");
      }
    };
    window.addEventListener("message", handleWindowMessage);

    return () => {
      window.removeEventListener("message", handleWindowMessage);
    };
  }, [queryClient, sessionQuery.data?.user?.id]);

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
        variables.newTab.location.href = "#" + url;
      } else {
        navigate(url);
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
    window.open("#" + url, "_blank", "noopener,noreferrer");
  };

  const openEditorTab = (url: string) => {
    if (typeof window === "undefined") return;
    window.open("#" + url, "_blank");
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
                        className="relative space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-sm transition hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:shadow-[var(--elevation-md)]"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center w-full">
                          <div className="flex flex-col gap-1.5 min-w-0 w-full md:w-auto">
                            <p className="min-w-0 flex-1 text-lg font-semibold text-[var(--foreground)]">
                              {row.title ?? "제목 없는 활동"}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <p className="text-xs text-[var(--muted-foreground)]">
                                <span className="font-mono text-[var(--accent)]">모둠 당 최소 필요 인원 : {row.activity_pack?.roles?.length ?? "—"}명</span>
                                <span className="mx-2">|</span>
                                {formatWhen(row.created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 w-full md:w-auto shrink-0">
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
                              className="gap-2 hidden md:inline-flex"
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
