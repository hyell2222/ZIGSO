"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteCase,
  listCases,
  startGameSession,
  type CaseListRow,
} from "@/lib/api/cases";
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
    queryKey: ["teacher-cases", sessionQuery.data?.user.id],
    queryFn: () => listCases(sessionQuery.data!.user.id),
    enabled: Boolean(sessionQuery.data?.user.id),
  });

  const startGameMutation = useMutation({
    mutationFn: async ({
      caseRow,
    }: {
      caseRow: CaseListRow;
      newTab: Window | null;
    }) => startGameSession(caseRow, sessionQuery.data?.user.id),
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
    mutationFn: async (caseId: string) => {
      setPendingDeleteId(caseId);
      try {
        await deleteCase(caseId);
      } finally {
        setPendingDeleteId(null);
      }
    },
    onMutate: () => setErrorMessage(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teacher-cases"] });
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const handleStartGame = (caseRow: CaseListRow) => {
    const newTab = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;
    startGameMutation.mutate({ caseRow, newTab });
  };

  const handleEdit = (row: CaseListRow) => {
    router.push(ROUTES.casesEdit(row.id));
  };

  const handleDelete = (row: CaseListRow) => {
    const title = row.title?.trim() || "제목 없는 사건";
    if (
      !window.confirm(
        `"${title}" 사건을 삭제할까요?\n담당 장소·단서 등 연결된 데이터도 모두 함께 삭제됩니다.`,
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
              title="내 사건"
              description="사건을 만든 뒤 수사 세션을 열면 학생이 참가 코드로 입장합니다."
              actions={
                (casesQuery.data?.length ?? 0) > 0 ? (
                  <Button
                    type="button"
                    onClick={() => router.push(ROUTES.casesNew)}
                    className="flex items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    새 사건 만들기
                  </Button>
                ) : null
              }
            />
            {casesQuery.isLoading ? (
              <LoadingState variant="section" label="사건 목록을 불러오는 중…" />
            ) : (casesQuery.data?.length ?? 0) === 0 ? (
              <div className="flex justify-center py-10">
                <Button type="button" onClick={() => router.push(ROUTES.casesNew)} className="flex items-center gap-2">
                  <PlusIcon className="h-4 w-4" />새 사건 만들기
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
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-[var(--foreground)]">
                          {row.title ?? "제목 없는 사건"}
                        </p>
                        <KebabMenu
                          disabled={isDeleting}
                          onEdit={() => handleEdit(row)}
                          onDelete={() => handleDelete(row)}
                        />
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] pb-2">
                        난이도 {row.difficulty ?? "—"} · 팀당 인원{" "}
                        {typeof row.locations?.[0]?.count === "number"
                          ? row.locations[0].count
                          : "—"}명
                      </p>
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
                            <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
                            플레이 시작하는 중…
                          </>
                        ) : (
                          "플레이 시작"
                        )}
                      </Button>
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
