"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getCurrentSession } from "@/lib/api/auth";
import { startGameSession } from "@/lib/api/game-sessions";
import { listScenarios, type ScenarioRecord } from "@/lib/api/scenarios";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

export default function AdminScenarioCreatePage() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [liveSession, setLiveSession] = useState<{ sessionId: string; joinCode: string; scenarioTitle: string } | null>(
    null,
  );

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
    onMutate: () => {
      setMessage(null);
    },
    onSuccess: (data) => {
      setLiveSession(data);
      setMessage("Game session created. Share the QR code or join code with students.");
    },
    onError: (error) => setMessage(error.message),
  });

  const joinUrl =
    typeof window === "undefined"
      ? "/play"
      : `${window.location.origin.replace(/\/$/, "")}/play${liveSession ? `?code=${liveSession.joinCode}` : ""}`;

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-4">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
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
                        Difficulty: {scenario.difficulty ?? "Unspecified"} · Players: {scenario.player_count ?? "TBD"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-300">
                        {scenario.description ?? "No description provided yet."}
                      </p>
                      <Button
                        onClick={() => startGameMutation.mutate(scenario)}
                        disabled={startGameMutation.isPending || !sessionQuery.data?.user.id}
                      >
                        {startGameMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Start Game
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {message ? <p className="text-xs text-slate-300">{message}</p> : null}
          </div>
        ) : null}
      </main>

      {liveSession ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setLiveSession(null)}
          role="presentation"
        >
          <section
            className="w-full max-w-lg space-y-4 rounded-xl border border-cyan-500/30 bg-slate-900 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-invite-title"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p id="student-invite-title" className="text-base font-semibold text-cyan-200">
                  Student Invite
                </p>
                <p className="text-sm text-slate-100">{liveSession.scenarioTitle}</p>
              </div>
              <Button variant="ghost" onClick={() => setLiveSession(null)}>
                Close
              </Button>
            </div>

            <p className="text-xs text-slate-400">Session ID: {liveSession.sessionId}</p>
            <p className="text-xs text-slate-300">
              Students can scan the QR code to open the player page, then enter this join code.
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}`}
                alt="QR code for play page"
                className="h-[180px] w-[180px] rounded-md border border-slate-700 bg-white p-1"
              />
              <div className="w-full space-y-2 text-sm">
                <p className="text-slate-400">Join code</p>
                <p className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-lg tracking-wider text-cyan-300">
                  {liveSession.joinCode}
                </p>
                <p className="break-all text-xs text-slate-400">Join URL: {joinUrl}</p>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
