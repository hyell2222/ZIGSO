"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { GamePhase } from "@/lib/types";

type GameSummary = {
  id: string;
  title: string;
  phase: GamePhase;
  classroom_code: string;
  created_at: string;
};

export default function AdminProjectsPage() {
  const router = useRouter();
  const [liveGameId, setLiveGameId] = useState<string>("");

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      const { data } = await supabase.auth.getSession();
      return data.session;
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

  const gamesQuery = useQuery({
    queryKey: ["admin-games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id,title,phase,classroom_code,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as GameSummary[];
    },
    enabled: Boolean(sessionQuery.data),
  });

  const hasGames = (gamesQuery.data?.length ?? 0) > 0;
  const liveGame = useMemo(
    () => gamesQuery.data?.find((game) => game.id === liveGameId),
    [gamesQuery.data, liveGameId],
  );
  const joinUrl =
    typeof window === "undefined" ? "/play" : `${window.location.origin.replace(/\/$/, "")}/play`;

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
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-slate-100">Game Projects</h1>
            {gamesQuery.isLoading ? (
              <p className="text-sm text-slate-300">Loading projects...</p>
            ) : hasGames ? (
              <div className="grid gap-3 md:grid-cols-2">
                {gamesQuery.data?.map((game) => (
                  <div
                    key={game.id}
                    className="space-y-3 rounded-md border border-slate-800 p-3 transition hover:border-slate-600"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-100">{game.title}</p>
                      <p className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-200">{game.phase}</p>
                    </div>
                    <p className="text-xs text-slate-400">Room code: {game.classroom_code}</p>
                    <Button onClick={() => setLiveGameId(game.id)}>Go Live</Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center py-6">
                <Button onClick={() => router.push(ROUTES.admin.projectsCreate)}>Create Game</Button>
              </div>
            )}

            {liveGame ? (
              <div className="space-y-3 rounded-md border border-cyan-500/30 bg-cyan-500/5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-cyan-200">Live Join Panel</p>
                  <Button variant="ghost" onClick={() => setLiveGameId("")}>
                    Close
                  </Button>
                </div>
                <p className="text-sm text-slate-100">{liveGame.title}</p>
                <p className="text-xs text-slate-300">
                  Students can scan the QR code to open the game page, then enter this game code and their team
                  access code.
                </p>
                <div className="flex flex-wrap items-start gap-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}`}
                    alt="QR code for play page"
                    className="h-[180px] w-[180px] rounded-md border border-slate-700 bg-white p-1"
                  />
                  <div className="space-y-2 text-sm">
                    <p className="text-slate-400">Game code</p>
                    <p className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-lg tracking-wider text-cyan-300">
                      {liveGame.classroom_code}
                    </p>
                    <p className="text-xs text-slate-400">Join URL: {joinUrl}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
