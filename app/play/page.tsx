"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { FinalVoteForm } from "@/components/play/final-vote-form";
import { InvestigationMapShell } from "@/components/play/investigation-map-shell";
import { SessionInfoLayout } from "@/components/play/session-info-layout";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getCharacterById,
  getPlaySessionDetails,
  getPlaySessionVoteOutcome,
  getScenarioMapEntities,
  getSessionByJoinCode,
  joinPlayerSession,
  listSessionCharacters,
} from "@/lib/api/play";
import type { ScenarioClueForMap } from "@/lib/api/play";
import { getSessionRoomChannelName } from "@/lib/realtime/session-presence";
import { isInvestigationPhase } from "@/lib/play-session-phase";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

function PlayPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const joinCode = searchParams.get("code")?.trim().toUpperCase() ?? "";
  const [nickname, setNickname] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState<string | null>(null);
  const [hideRoleReveal, setHideRoleReveal] = useState(false);
  const [discoveredClueIds, setDiscoveredClueIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const characterQuery = useQuery({
    queryKey: ["play-character", characterId, sessionId],
    queryFn: async () => getCharacterById(characterId as string),
    enabled: Boolean(characterId && sessionId),
  });

  const sessionQuery = useQuery({
    queryKey: ["play-session", sessionId],
    queryFn: async () => getPlaySessionDetails(sessionId as string),
    enabled: Boolean(sessionId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: sessionId ? 3_000 : false,
    refetchIntervalInBackground: true,
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
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          void queryClient.invalidateQueries({ queryKey: ["play-session", sessionId] });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, playerId, characterId, characterName, nickname, queryClient]);

  const sessionPhase = sessionQuery.data?.phase ?? (sessionId ? "waiting" : null);

  useEffect(() => {
    if (sessionPhase !== "session_ended") return;
    router.replace(ROUTES.home);
  }, [sessionPhase, router]);

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
  const hasJoinedSession = Boolean(characterId && sessionId);
  const shouldShowCharacterReveal =
    hasJoinedSession && sessionPhase === "role_assignment" && !hideRoleReveal;
  const shouldShowSessionDetails = hasJoinedSession && (hideRoleReveal || sessionPhase !== "role_assignment");

  const showInvestigationMap =
    isInvestigationPhase(sessionPhase) && Boolean(characterId) && !isWaitingLobby;
  const showBriefingInfoOnly = sessionPhase === "briefing" && Boolean(characterId) && !isWaitingLobby;

  const showFinalVoteOnly =
    sessionPhase === "final_vote" && Boolean(characterId) && Boolean(sessionId) && !isWaitingLobby;
  const showArrestOutcomeOnly =
    sessionPhase === "arrest_result" && Boolean(characterId) && Boolean(sessionId) && !isWaitingLobby;

  const mapQuery = useQuery({
    queryKey: ["play-scenario-map", sessionQuery.data?.scenario_id, sessionPhase],
    queryFn: async () => getScenarioMapEntities(sessionQuery.data!.scenario_id!),
    enabled: Boolean((showInvestigationMap || showBriefingInfoOnly) && sessionQuery.data?.scenario_id),
  });

  const discoveredCluesForBriefing = useMemo(() => {
    const byId = new Map((mapQuery.data?.clues ?? []).map((clue) => [clue.id, clue]));
    return discoveredClueIds
      .map((id) => byId.get(id))
      .filter((clue): clue is ScenarioClueForMap => clue != null)
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [discoveredClueIds, mapQuery.data?.clues]);

  useEffect(() => {
    setDiscoveredClueIds([]);
  }, [sessionId]);

  const voteCharactersQuery = useQuery({
    queryKey: ["play-session-characters", sessionId],
    queryFn: async () => listSessionCharacters(sessionId as string),
    enabled: Boolean(showFinalVoteOnly && sessionId),
  });

  const voteOutcomeQuery = useQuery({
    queryKey: ["play-session-vote-outcome", sessionId],
    queryFn: async () => getPlaySessionVoteOutcome(sessionId as string),
    enabled: Boolean(showArrestOutcomeOnly && sessionId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const ROLES: { key: string; label: string }[] = [
    { key: "suspect", label: "용의자" },
    { key: "culprit", label: "범인" },
  ];

  if (hasSupabaseEnv && showFinalVoteOnly && sessionId && characterId) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-auto bg-[var(--background)] p-4">
        {voteCharactersQuery.isLoading ? (
          <div className="flex flex-col items-center gap-3 text-[var(--muted-foreground)]" role="status" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" aria-hidden />
            <p className="text-sm">투표 정보를 불러오는 중…</p>
          </div>
        ) : voteCharactersQuery.isError ? (
          <div className="max-w-md text-center text-sm text-[var(--primary)]">
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

  if (hasSupabaseEnv && showArrestOutcomeOnly) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-auto bg-[var(--background)] p-4">
        {voteOutcomeQuery.isLoading ? (
          <div className="flex flex-col items-center gap-3 text-[var(--muted-foreground)]" role="status" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" aria-hidden />
            <p className="text-sm">검거 결과를 불러오는 중…</p>
          </div>
        ) : voteOutcomeQuery.isError ? (
          <div className="max-w-md text-center text-sm text-[var(--primary)]">
            검거 결과를 불러오지 못했습니다.
            {voteOutcomeQuery.error instanceof Error ? ` ${voteOutcomeQuery.error.message}` : null}
          </div>
        ) : (
          <Card className="mx-auto w-full max-w-md border-[var(--border)] bg-[rgba(36,40,43,0.9)]">
            <CardHeader>
              <CardTitle className={voteOutcomeQuery.data?.culpritArrested ? "text-[var(--accent)]" : "text-[var(--primary)]"}>
                {voteOutcomeQuery.data?.culpritArrested ? "범인 지목 성공" : "범인 지목 실패"}
              </CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {voteOutcomeQuery.data?.culpritArrested
                  ? "최종 투표 결과, 범인을 정확히 지목했습니다."
                  : "최종 투표 결과, 실제 범인을 지목하지 못했습니다."}
              </p>
            </CardHeader>
          </Card>
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
        discoveredClueIds={discoveredClueIds}
        onDiscoveredClueIdsChange={setDiscoveredClueIds}
      />
    );
  }

  if (hasSupabaseEnv && showBriefingInfoOnly) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <div className="space-y-4">
            <SessionInfoLayout
              characterName={characterName}
              characterQuery={characterQuery}
              sessionQuery={sessionQuery}
              message={message}
            />
            <Card>
              <CardHeader>
                <CardTitle>증거 인벤토리</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {mapQuery.isLoading ? (
                  <p className="text-sm text-[var(--muted-foreground)]">증거를 불러오는 중…</p>
                ) : mapQuery.isError ? (
                  <p className="text-sm text-[var(--primary)]">
                    증거 목록을 불러오지 못했습니다.
                    {mapQuery.error instanceof Error ? ` ${mapQuery.error.message}` : null}
                  </p>
                ) : discoveredCluesForBriefing.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">아직 수집한 증거가 없습니다.</p>
                ) : (
                  <ul className="space-y-2">
                    {discoveredCluesForBriefing.map((clue) => (
                      <li
                        key={clue.id}
                        className="rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.35)] px-3 py-2 text-sm text-[var(--foreground)]"
                      >
                        <p className="font-medium text-[var(--accent)]">{clue.name ?? "이름 없는 증거"}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{clue.location_id ?? "위치 정보 없음"}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (!hasSupabaseEnv) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>Setup Required</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--foreground)]">
              Add Supabase environment variables to run multiplayer classroom mode.
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-7xl px-4 py-8">

        {!hasJoinedSession ? (
          <section className="flex items-center justify-center rounded-lg bg-[rgba(15,17,19,0.88)] p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">닉네임 설정 (필수)</h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                닉네임을 입력하면 바로 입장하고 캐릭터가 랜덤 배정됩니다.
              </p>
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
                <p className="mt-3 text-xs text-[var(--accent)]">입장 코드가 없습니다. 홈에서 코드를 입력해 다시 입장해 주세요.</p>
              ) : null}
              {message ? <p className="mt-3 text-xs text-[var(--foreground)]">{message}</p> : null}
            </div>
          </section>
        ) : null}

        {shouldShowCharacterReveal ? (
          <section className="rounded-lg border border-[var(--accent)]/40 bg-[var(--surface)] p-6">
            {characterQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-[var(--muted-foreground)]">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" aria-hidden />
                <p className="text-sm">캐릭터 정보를 불러오는 중…</p>
              </div>
            ) : characterQuery.isError ? (
              <div className="py-6 text-sm text-[var(--primary)]">
                캐릭터 정보를 불러오지 못했습니다.
                {characterQuery.error instanceof Error ? ` ${characterQuery.error.message}` : null}
              </div>
            ) : characterQuery.data ? (
              <>
                <h3 className="text-xl font-semibold text-[var(--accent)]">내 캐릭터 배정 완료</h3>
                <p className="mt-2 text-sm text-[var(--foreground)]">
                  입장이 완료되었습니다. 당신에게 배정된 캐릭터 정보입니다.
                </p>
                <div className="mt-5 rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.35)] p-4">
                  <p className="text-xs text-[var(--muted-foreground)]">CHARACTER</p>
                  <p className="text-lg font-semibold text-[var(--accent)]">
                    {characterName ?? characterQuery.data.name}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">ROLE</p>
                  <p className="text-sm text-[var(--foreground)]">
                    {ROLES.find((r) => r.key === characterQuery.data.role)?.label ?? characterQuery.data.role ?? "Unknown role"}
                  </p>
                </div>
                <Button className="mt-5 w-full" onClick={() => setHideRoleReveal(true)}>
                  확인하고 게임 화면으로
                </Button>
              </>
            ) : null}
          </section>
        ) : null}

        {hasJoinedSession && isWaitingLobby ? (
          <Card className="mt-4">
            <CardContent className="flex items-center gap-3 py-5 text-[var(--foreground)]">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" aria-hidden />
              <p className="text-sm">교사가 게임을 시작할 때까지 잠시만 기다려 주세요.</p>
            </CardContent>
          </Card>
        ) : null}

        {shouldShowSessionDetails ? (
          <div className="mt-4">
            <SessionInfoLayout
              characterName={characterName}
              characterQuery={characterQuery}
              sessionQuery={sessionQuery}
              message={message}
            />
          </div>
        ) : null}
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
            <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
          </main>
        </div>
      }
    >
      <PlayPageContent />
    </Suspense>
  );
}
