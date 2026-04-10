"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { FinalVoteForm } from "@/components/play/final-vote-form";
import { InvestigationMapShell } from "@/components/play/investigation-map-shell";
import { SessionInfoLayout } from "@/components/play/session-info-layout";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getCharacterById,
  getScenarioMapEntities,
  getSessionByJoinCode,
  getSessionDetails,
  joinPlayerSession,
  listSessionCharacters,
} from "@/lib/api/play";
import { getSessionRoomChannelName } from "@/lib/realtime/session-presence";
import { isInvestigationPhase } from "@/lib/play-session-phase";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

function PlayPageContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const joinCode = searchParams.get("code")?.trim().toUpperCase() ?? "";
  const [nickname, setNickname] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState<string | null>(null);
  const [hideRoleReveal, setHideRoleReveal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const characterQuery = useQuery({
    queryKey: ["play-character", characterId, sessionId],
    queryFn: async () => getCharacterById(characterId as string),
    enabled: Boolean(characterId && sessionId),
  });

  const sessionQuery = useQuery({
    queryKey: ["play-session", sessionId],
    queryFn: async () => getSessionDetails(sessionId as string),
    enabled: Boolean(sessionId),
  });

  useEffect(() => {
    if (!hasSupabaseEnv || !sessionId || !playerId) return;

    const channel = supabase
      .channel(getSessionRoomChannelName(sessionId), {
        config: {
          presence: {
            key: `player:${playerId}`,
          },
        },
      })
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${sessionId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["play-session", sessionId] });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({
            role: "player",
            player_id: playerId,
            nickname: nickname.trim() || "Player",
            character_id: characterId ?? undefined,
            character_name: characterName ?? undefined,
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, playerId, characterId, characterName, nickname, queryClient]);

  const sessionPhase = sessionQuery.data?.phase ?? (sessionId ? "waiting" : null);

  const joinAndRegisterMutation = useMutation({
    mutationFn: async () => {
      const normalizedJoinCode = joinCode.trim().toUpperCase();
      if (!normalizedJoinCode) throw new Error("Invalid access. Please enter from home with a join code.");
      if (!nickname.trim()) throw new Error("Enter your nickname.");

      const session = await getSessionByJoinCode(normalizedJoinCode);
      setSessionId(session.id);

      const result = await joinPlayerSession({
        session_id: session.id,
        nickname: nickname.trim(),
      });
      setPlayerId(result.player.id);
      setCharacterId(result.player.character_id ?? result.character.id);
      setCharacterName(result.character.name ?? "Character");
      setHideRoleReveal(false);
    },
    onSuccess: () => setMessage("Joined successfully. Character assigned randomly."),
    onError: (error) => setMessage(error.message),
  });

  const isWaitingLobby =
    Boolean(characterId && sessionId) &&
    (sessionQuery.isLoading || sessionPhase === "waiting");
  const shouldShowRoleReveal =
    sessionPhase === "role_assignment" &&
    Boolean(characterId) &&
    !hideRoleReveal;

  const showInvestigationMap =
    isInvestigationPhase(sessionPhase) && Boolean(characterId) && !isWaitingLobby;

  const showFinalVoteOnly =
    sessionPhase === "final_vote" && Boolean(characterId) && Boolean(sessionId) && !isWaitingLobby;

  const mapQuery = useQuery({
    queryKey: ["play-scenario-map", sessionQuery.data?.scenario_id, sessionPhase],
    queryFn: async () => getScenarioMapEntities(sessionQuery.data!.scenario_id!),
    enabled: Boolean(showInvestigationMap && sessionQuery.data?.scenario_id),
  });

  const voteCharactersQuery = useQuery({
    queryKey: ["play-session-characters", sessionId],
    queryFn: async () => listSessionCharacters(sessionId as string),
    enabled: Boolean(showFinalVoteOnly && sessionId),
  });

  const body = !hasSupabaseEnv ? (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Setup Required</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-300">
        Add Supabase environment variables to run multiplayer classroom mode.
      </CardContent>
    </Card>
  ) : (
    <div className="relative">
      {!characterId ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold text-slate-100">닉네임 설정 (필수)</h3>
            <p className="mt-1 text-sm text-slate-400">닉네임을 입력하면 바로 입장하고 캐릭터가 랜덤 배정됩니다.</p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                joinAndRegisterMutation.mutate();
              }}
            >
              <Input
                placeholder="닉네임"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={joinAndRegisterMutation.isPending}>
                Join as Player
              </Button>
            </form>
            {!joinCode.trim() ? (
              <p className="mt-3 text-xs text-amber-300">입장 코드가 없습니다. 홈에서 코드를 입력해 다시 입장해 주세요.</p>
            ) : null}
            {message ? <p className="mt-3 text-xs text-slate-300">{message}</p> : null}
          </div>
        </div>
      ) : null}

      {isWaitingLobby ? (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-lg bg-slate-950/95 p-6 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" aria-hidden />
          <p className="text-center text-sm text-slate-300">교사가 게임을 시작할 때까지 잠시만 기다려 주세요.</p>
        </div>
      ) : null}

      {shouldShowRoleReveal && characterQuery.data ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-lg bg-slate-950/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-cyan-800/60 bg-slate-900 p-6">
            <h3 className="text-xl font-semibold text-cyan-200">내 캐릭터 배정 완료</h3>
            <p className="mt-2 text-sm text-slate-300">입장이 완료되었습니다. 당신에게 배정된 캐릭터 정보입니다.</p>
            <div className="mt-5 rounded-md border border-slate-700 bg-slate-950/70 p-4">
              <p className="text-xs text-slate-400">CHARACTER</p>
              <p className="text-lg font-semibold text-cyan-300">{characterName ?? characterQuery.data.name}</p>
              <p className="mt-2 text-xs text-slate-400">ROLE</p>
              <p className="text-sm text-slate-100">{characterQuery.data.role ?? "Unknown role"}</p>
            </div>
            <Button className="mt-5 w-full" onClick={() => setHideRoleReveal(true)}>
              확인하고 게임 화면으로
            </Button>
          </div>
        </div>
      ) : null}

      <div
        className={`grid gap-4 lg:grid-cols-[1fr_1.2fr] ${isWaitingLobby ? "pointer-events-none min-h-[280px] opacity-0" : ""}`}
        aria-hidden={isWaitingLobby}
      >
        <SessionInfoLayout
          characterName={characterName}
          characterQuery={characterQuery}
          sessionQuery={sessionQuery}
          message={message}
        />
      </div>
    </div>
  );

  if (hasSupabaseEnv && showFinalVoteOnly && sessionId && characterId) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-auto bg-slate-950 p-4">
        {voteCharactersQuery.isLoading ? (
          <div className="flex flex-col items-center gap-3 text-slate-400" role="status" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" aria-hidden />
            <p className="text-sm">투표 정보를 불러오는 중…</p>
          </div>
        ) : voteCharactersQuery.isError ? (
          <div className="max-w-md text-center text-sm text-red-300">
            캐릭터 목록을 불러오지 못했습니다.
            {voteCharactersQuery.error instanceof Error ? ` ${voteCharactersQuery.error.message}` : null}
          </div>
        ) : (
          <FinalVoteForm
            playerId={playerId}
            ownCharacterId={characterId}
            characters={(voteCharactersQuery.data ?? []).map((c) => ({
              id: c.id,
              name: c.name,
              role: c.role,
            }))}
          />
        )}
      </div>
    );
  }

  if (hasSupabaseEnv && showInvestigationMap && sessionPhase && isInvestigationPhase(sessionPhase)) {
    return (
      <InvestigationMapShell
        phase={sessionPhase}
        mapLoading={mapQuery.isLoading}
        mapError={mapQuery.error as Error | null}
        locations={mapQuery.data?.locations ?? []}
        clues={mapQuery.data?.clues ?? []}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-100">Player Session Room</h2>
          <p className="text-sm text-slate-400">
            Join a session with a join code, set your nickname, and receive a random character assignment.
          </p>
        </div>
        {body}
      </main>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <TopNav />
          <main className="mx-auto w-full max-w-7xl px-4 py-8">
            <p className="text-sm text-slate-400">Loading…</p>
          </main>
        </div>
      }
    >
      <PlayPageContent />
    </Suspense>
  );
}
