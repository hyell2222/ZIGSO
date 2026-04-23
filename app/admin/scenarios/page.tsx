"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  deleteScenario,
  listScenarios,
  startGameSession,
  type ScenarioRecord,
} from "@/lib/api/scenarios";
import { getCurrentSession } from "@/lib/api/auth";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

export default function AdminScenariosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      return getCurrentSession();
    },
  });

  useEffect(() => {
    if (sessionQuery.isLoading) return;
    if (!hasSupabaseEnv) {
      router.replace(ROUTES.admin.signIn);
      return;
    }
    if (!sessionQuery.data) router.replace(ROUTES.admin.signIn);
  }, [router, sessionQuery.data, sessionQuery.isLoading]);

  const scenariosQuery = useQuery({
    queryKey: ["admin-scenarios", sessionQuery.data?.user.id],
    queryFn: () => listScenarios(sessionQuery.data!.user.id),
    enabled: Boolean(sessionQuery.data?.user.id),
  });

  const startGameMutation = useMutation({
    mutationFn: async ({
      scenario,
    }: {
      scenario: ScenarioRecord;
      newTab: Window | null;
    }) => startGameSession(scenario, sessionQuery.data?.user.id),
    onMutate: () => setErrorMessage(null),
    onSuccess: (data, variables) => {
      const url = ROUTES.admin.scenariosSession(data.sessionId);
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
    mutationFn: async (scenarioId: string) => {
      setPendingDeleteId(scenarioId);
      try {
        await deleteScenario(scenarioId);
      } finally {
        setPendingDeleteId(null);
      }
    },
    onMutate: () => setErrorMessage(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-scenarios"] });
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const handleStartGame = (scenario: ScenarioRecord) => {
    const newTab = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;
    startGameMutation.mutate({ scenario, newTab });
  };

  const handleEdit = (scenario: ScenarioRecord) => {
    router.push(ROUTES.admin.scenariosEdit(scenario.id));
  };

  const handleDelete = (scenario: ScenarioRecord) => {
    const title = scenario.title?.trim() || "Untitled scenario";
    if (
      !window.confirm(
        `"${title}" 시나리오를 삭제할까요?\n캐릭터/단서 등 연결된 데이터도 모두 함께 삭제됩니다.`,
      )
    ) {
      return;
    }
    deleteMutation.mutate(scenario.id);
  };

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-4" />
        {sessionQuery.data ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Scenario List</h2>
              {(scenariosQuery.data?.length ?? 0) > 0 ? (
                <Button type="button" onClick={() => router.push(ROUTES.admin.scenariosCreate)}>
                  Create
                </Button>
              ) : null}
            </div>
            {scenariosQuery.isLoading ? (
              <p className="text-sm text-[var(--muted-foreground)]">Loading scenarios...</p>
            ) : (scenariosQuery.data?.length ?? 0) === 0 ? (
              <div className="flex justify-center py-10">
                <Button type="button" onClick={() => router.push(ROUTES.admin.scenariosCreate)}>
                  Create
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {scenariosQuery.data?.map((scenario) => {
                  const isDeleting = pendingDeleteId === scenario.id;
                  return (
                    <div
                      key={scenario.id}
                      className="relative space-y-3 rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.45)] p-3 text-left transition hover:border-[var(--accent)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-[var(--foreground)]">
                          {scenario.title ?? "Untitled scenario"}
                        </p>
                        <KebabMenu
                          disabled={isDeleting}
                          onEdit={() => handleEdit(scenario)}
                          onDelete={() => handleDelete(scenario)}
                        />
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Difficulty: {scenario.difficulty ?? "Unspecified"} · Players:{" "}
                        {scenario.character_count ?? "TBD"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--foreground)]">
                        {scenario.description ?? "No description provided yet."}
                      </p>
                      <Button
                        type="button"
                        onClick={() => handleStartGame(scenario)}
                        disabled={
                          startGameMutation.isPending ||
                          isDeleting ||
                          !sessionQuery.data?.user.id
                        }
                      >
                        {startGameMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Start Game
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            {errorMessage ? (
              <p className="text-sm text-[var(--primary)]">{errorMessage}</p>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}

/* ---------------- Kebab menu ---------------- */

function KebabMenu({
  onEdit,
  onDelete,
  disabled,
}: {
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (event: PointerEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        variant="ghost"
        size="icon"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-7 z-20 min-w-[140px] overflow-hidden rounded-md border border-[var(--border)] bg-[var(--background)] shadow-lg"
        >
          <MenuItem
            icon={<Pencil className="h-3.5 w-3.5" />}
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            수정
          </MenuItem>
          <MenuItem
            icon={<Trash2 className="h-3.5 w-3.5" />}
            danger
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            삭제
          </MenuItem>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="menu"
      onClick={onClick}
      className={
        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors " +
        (danger
          ? "text-red-300 hover:bg-red-500/10"
          : "text-[var(--foreground)] hover:bg-[rgba(36,40,43,0.85)]")
      }
    >
      {icon}
      {children}
    </Button>
  );
}
