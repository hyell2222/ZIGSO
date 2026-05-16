"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Loader2, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteLesson,
  formatDifficultyForUi,
  listLessons,
  startSession,
  type LessonListRow,
} from "@/lib/api/lessons";
import { useRequireTeacherSession } from "@/lib/auth/use-require-teacher-session";
import { KebabMenu } from "@/components/ui/kebab-menu";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

export default function CasesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const sessionQuery = useRequireTeacherSession();

  const casesQuery = useQuery({
    queryKey: ["teacher-scenarios", sessionQuery.data?.user.id],
    queryFn: () => listLessons(sessionQuery.data!.user.id),
    enabled: Boolean(sessionQuery.data?.user.id),
  });

  const startGameMutation = useMutation({
    mutationFn: async ({
      lessonRow,
    }: {
      lessonRow: LessonListRow;
      newTab: Window | null;
    }) => startSession(lessonRow, sessionQuery.data?.user.id),
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
    mutationFn: async (lessonId: string) => {
      setPendingDeleteId(lessonId);
      try {
        await deleteLesson(lessonId);
      } finally {
        setPendingDeleteId(null);
      }
    },
    onMutate: () => setErrorMessage(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teacher-scenarios"] });
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const handleStartGame = (lessonRow: LessonListRow) => {
    const newTab = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;
    startGameMutation.mutate({ lessonRow, newTab });
  };

  const handleSandbox = (lessonRow: LessonListRow) => {
    if (typeof window === "undefined") return;
    const url = ROUTES.casesSandbox(lessonRow.id);
    /**
     * 학생/교사 화면을 함께 시연하는 시뮬레이션은 항상 새 탭에서 띄웁니다.
     * (popup window 가 차단당하면 noopener 새 탭으로 폴백)
     */
    const features =
      "noopener,noreferrer," +
      "width=1480,height=900,menubar=no,toolbar=no,location=no,status=no";
    const popup = window.open(url, `mc-sandbox-${lessonRow.id}`, features);
    if (!popup) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleEdit = (row: LessonListRow) => {
    router.push(ROUTES.casesEdit(row.id));
  };

  const handleDelete = (row: LessonListRow) => {
    const title = row.title?.trim() || "제목 없는 수업";
    if (
      !window.confirm(
        `"${title}" 수업을 삭제할까요?\n급식 시나리오와 연결된 데이터도 모두 함께 삭제됩니다.`,
      )
    ) {
      return;
    }
    deleteMutation.mutate(row.id);
  };

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
        {sessionQuery.data ? (
          <div className="space-y-6">
            <PageHeader
              title="내 수업"
              description="급식 시나리오를 만든 뒤 플레이를 시작하면 학생이 참가 코드로 입장합니다."
              actions={
                (casesQuery.data?.length ?? 0) > 0 ? (
                  <Button
                    type="button"
                    onClick={() => router.push(ROUTES.casesNew)}
                    className="flex items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    새 수업 만들기
                  </Button>
                ) : null
              }
            />
            {casesQuery.isLoading ? (
              <LoadingState variant="section" label="불러오는 중…" />
            ) : (casesQuery.data?.length ?? 0) === 0 ? (
              <div className="flex justify-center py-10">
                <Button type="button" onClick={() => router.push(ROUTES.casesNew)} className="flex items-center gap-2">
                  <PlusIcon className="h-4 w-4" />새 수업 만들기
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                {casesQuery.data?.map((row) => {
                  const isDeleting = pendingDeleteId === row.id;
                  return (
                    <div
                      key={row.id}
                      className="relative space-y-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition hover:border-[var(--mystery)]/50"
                    >
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 font-semibold text-[var(--foreground)]">
                          {row.title ?? "제목 없는 수업"}
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
                        난이도 {formatDifficultyForUi(row.difficulty)} · 팀{" "}
                        {row.team_size ?? "—"}명 · 메뉴 {row.menu_count ?? "—"}개
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
