"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
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
    mutationFn: (scenario: ScenarioRecord) => startGameSession(scenario, sessionQuery.data?.user.id),
    onMutate: () => setErrorMessage(null),
    onSuccess: (data) => {
      router.push(ROUTES.admin.scenariosSession(data.sessionId));
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-4">
        </div>
        {sessionQuery.data ? (
          <div className="space-y-6">
            <section className="space-y-4 rounded-md border border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-100">Scenario List</h2>
                {(scenariosQuery.data?.length ?? 0) > 0 ? (
                  <Button onClick={() => router.push(ROUTES.admin.scenariosCreate)}>Create</Button>
                ) : null}
              </div>
              {scenariosQuery.isLoading ? (
                <p className="text-sm text-slate-400">Loading scenarios...</p>
              ) : (scenariosQuery.data?.length ?? 0) === 0 ? (
                <div className="flex justify-center py-10">
                  <Button onClick={() => router.push(ROUTES.admin.scenariosCreate)}>Create</Button>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {scenariosQuery.data?.map((scenario) => (
                    <div
                      key={scenario.id}
                      className="space-y-3 rounded-md border border-slate-700 p-3 text-left transition hover:border-slate-500"
                    >
                      <p className="font-semibold text-slate-100">{scenario.title ?? "Untitled scenario"}</p>
                      <p className="text-xs text-slate-400">
                        Difficulty: {scenario.difficulty ?? "Unspecified"} · Players: {scenario.character_count ?? "TBD"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-300">
                        {scenario.description ?? "No description provided yet."}
                      </p>
                      <Button
                        onClick={() => startGameMutation.mutate(scenario)}
                        disabled={startGameMutation.isPending || !sessionQuery.data?.user.id}
                      >
                        {startGameMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Start Game
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {errorMessage ? <p className="text-sm text-red-400">{errorMessage}</p> : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
