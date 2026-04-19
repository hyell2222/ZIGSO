"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getCurrentSession } from "@/lib/api/auth";
import { listScenarios, startGameSession, type ScenarioRecord } from "@/lib/api/scenarios";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

export default function AdminScenariosPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        // Popup blocked or closed; fall back to navigating current tab.
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

  const handleStartGame = (scenario: ScenarioRecord) => {
    // window.open must be called synchronously in the click handler, otherwise
    // browsers' popup blockers will prevent the new tab from opening.
    const newTab = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;
    startGameMutation.mutate({ scenario, newTab });
  };

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-4">
        </div>
        {sessionQuery.data ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Scenario List</h2>
                {(scenariosQuery.data?.length ?? 0) > 0 ? (
                  <Button onClick={() => router.push(ROUTES.admin.scenariosCreate)}>Create</Button>
                ) : null}
            </div>
            {scenariosQuery.isLoading ? (
              <p className="text-sm text-[var(--muted-foreground)]">Loading scenarios...</p>
            ) : (scenariosQuery.data?.length ?? 0) === 0 ? (
              <div className="flex justify-center py-10">
                <Button onClick={() => router.push(ROUTES.admin.scenariosCreate)}>Create</Button>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {scenariosQuery.data?.map((scenario) => (
                  <div
                    key={scenario.id}
                    className="space-y-3 rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.45)] p-3 text-left transition hover:border-[var(--accent)]"
                  >
                    <p className="font-semibold text-[var(--foreground)]">{scenario.title ?? "Untitled scenario"}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Difficulty: {scenario.difficulty ?? "Unspecified"} · Players: {scenario.character_count ?? "TBD"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--foreground)]">
                      {scenario.description ?? "No description provided yet."}
                    </p>
                    <Button
                      onClick={() => handleStartGame(scenario)}
                      disabled={startGameMutation.isPending || !sessionQuery.data?.user.id}
                    >
                      {startGameMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Start Game
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {errorMessage ? <p className="text-sm text-[var(--primary)]">{errorMessage}</p> : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
