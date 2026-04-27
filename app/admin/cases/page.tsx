"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  deleteCase,
  listCases,
  startGameSession,
  type CaseListRow,
} from "@/lib/api/cases";
import { getCurrentSession } from "@/lib/api/auth";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth-session-query";
import { KebabMenu } from "@/components/admin/kebab-menu";
import { PageHeader } from "@/components/layout/page-header";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

export default function AdminCasesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
    if (!hasSupabaseEnv) {
      router.replace(ROUTES.admin.login);
      return;
    }
    if (!sessionQuery.data) router.replace(ROUTES.admin.login);
  }, [router, sessionQuery.data, sessionQuery.isLoading, sessionQuery.isFetching]);

  const casesQuery = useQuery({
    queryKey: ["admin-cases", sessionQuery.data?.user.id],
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
      const url = ROUTES.admin.sessionHost(data.sessionId);
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
      await queryClient.invalidateQueries({ queryKey: ["admin-cases"] });
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const handleStartGame = (caseRow: CaseListRow) => {
    const newTab = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;
    startGameMutation.mutate({ caseRow, newTab });
  };

  const handleEdit = (row: CaseListRow) => {
    router.push(ROUTES.admin.casesEdit(row.id));
  };

  const handleDelete = (row: CaseListRow) => {
    const title = row.title?.trim() || "제목 없는 사건";
    if (
      !window.confirm(
        `"${title}" 사건을 삭제할까요?\n담당 구역·단서 등 연결된 데이터도 모두 함께 삭제됩니다.`,
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
              title="사건 목록"
              description="사건을 만들어 수사 세션을 시작해보세요."
              actions={
                (casesQuery.data?.length ?? 0) > 0 ? (
                  <Button
                    type="button"
                    onClick={() => router.push(ROUTES.admin.casesNew)}
                    className="flex items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    새 사건 만들기
                  </Button>
                ) : null
              }
            />
            {casesQuery.isLoading ? (
              <p className="text-sm text-[var(--muted-foreground)]">불러오는 중…</p>
            ) : (casesQuery.data?.length ?? 0) === 0 ? (
              <div className="flex justify-center py-10">
                <Button type="button" onClick={() => router.push(ROUTES.admin.casesNew)} className="flex items-center gap-2">
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
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-[var(--foreground)]">
                          {row.title ?? "제목 없는 사건"}
                        </p>
                        <KebabMenu
                          disabled={isDeleting}
                          onEdit={() => handleEdit(row)}
                          onDelete={() => handleDelete(row)}
                        />
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        난이도: {row.difficulty ?? "—"} · 조사 맵(장소):{" "}
                        {typeof row.locations?.[0]?.count === "number"
                          ? row.locations[0].count
                          : "—"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--foreground)]">
                        {row.description ?? "No description provided yet."}
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
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        수사 세션 시작
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            {errorMessage ? (
              <p className="text-sm text-[var(--error)]">{errorMessage}</p>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
