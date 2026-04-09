"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  getSessionByJoinCode,
  getSessionDetails,
  getTeamById,
  joinPlayerSession,
  submitVote,
} from "@/lib/api/play";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSessionRoomChannelName } from "@/lib/realtime/session-presence";
import { TeamSubmission } from "@/lib/types";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

const defaultSubmission: TeamSubmission = {
  culprit: "",
  motive: "",
  method: "",
  timeline: "",
};

export default function PlayPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const joinCode = searchParams.get("code")?.trim().toUpperCase() ?? "";
  const [nickname, setNickname] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [submission, setSubmission] = useState<TeamSubmission>(defaultSubmission);
  const [message, setMessage] = useState<string | null>(null);

  const teamQuery = useQuery({
    queryKey: ["play-team", teamId, sessionId],
    queryFn: async () => getTeamById(teamId as string),
    enabled: Boolean(teamId && sessionId),
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
            team_id: teamId ?? undefined,
            team_name: teamName ?? undefined,
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, playerId, teamId, teamName, nickname, queryClient]);

  const sessionPhase = sessionQuery.data?.phase ?? (sessionId ? "waiting" : null);

  useEffect(() => {
    const p = sessionQuery.data?.phase;
    if (p === "role_assignment" && teamId) {
      setShowRoleReveal(true);
    } else if (p && p !== "role_assignment") {
      setShowRoleReveal(false);
    }
  }, [sessionQuery.data?.phase, teamId]);

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
      setTeamId(result.team.id);
      setTeamName(result.team.name ?? "Team");
    },
    onSuccess: () => setMessage("Joined successfully. Team assigned randomly."),
    onError: (error) => setMessage(error.message),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!teamId || !sessionId) throw new Error("Join a session first.");
      await submitVote({
        session_id: sessionId,
        team_id: teamId,
        target_team_id: submission.culprit,
      });
    },
    onSuccess: () => setMessage("Vote submitted."),
    onError: (error) => setMessage(error.message),
  });

  const phaseHelp = useMemo(() => {
    const row = sessionQuery.data;
    if (!row) return "";
    const phase = row.phase ?? "waiting";
    if (phase === "session_ended") return "This session has ended.";
    if (phase === "waiting") return "Wait for the teacher to start the game.";
    switch (phase) {
      case "role_assignment":
        return "Role assignment and understanding the case.";
      case "first_investigation":
        return "First on-site investigation.";
      case "briefing":
        return "Briefing phase.";
      case "second_investigation":
        return "Second on-site investigation.";
      case "final_vote":
        return "Final vote and accusation.";
      default:
        return "Follow the teacher's instructions.";
    }
  }, [sessionQuery.data]);

  const isWaitingLobby =
    Boolean(teamId && sessionId) &&
    (sessionQuery.isLoading || sessionPhase === "waiting");

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
      {!teamId ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold text-slate-100">닉네임 설정 (필수)</h3>
            <p className="mt-1 text-sm text-slate-400">닉네임을 입력하면 바로 입장하고 팀이 랜덤 배정됩니다.</p>
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

      {showRoleReveal &&
      teamQuery.data &&
      sessionPhase === "role_assignment" ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-lg bg-slate-950/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-cyan-800/60 bg-slate-900 p-6">
            <h3 className="text-xl font-semibold text-cyan-200">내 팀 배정 완료</h3>
            <p className="mt-2 text-sm text-slate-300">입장이 완료되었습니다. 당신의 팀(캐릭터) 정보입니다.</p>
            <div className="mt-5 rounded-md border border-slate-700 bg-slate-950/70 p-4">
              <p className="text-xs text-slate-400">TEAM</p>
              <p className="text-lg font-semibold text-cyan-300">{teamName ?? teamQuery.data.name}</p>
              <p className="mt-2 text-xs text-slate-400">CHARACTER ID</p>
              <p className="font-mono text-sm text-slate-100">{teamQuery.data.character_id}</p>
            </div>
            <Button className="mt-5 w-full" onClick={() => setShowRoleReveal(false)}>
              확인하고 게임 화면으로
            </Button>
          </div>
        </div>
      ) : null}

      <div
        className={`grid gap-4 lg:grid-cols-[1fr_1.2fr] ${isWaitingLobby ? "pointer-events-none min-h-[280px] opacity-0" : ""}`}
        aria-hidden={isWaitingLobby}
      >
        <Card>
          <CardHeader>
            <CardTitle>Session Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamQuery.data ? (
              <div className="rounded-md border border-slate-800 p-3 text-sm text-slate-200">
                <p className="font-semibold text-cyan-300">{teamName ?? teamQuery.data.name}</p>
                <p className="text-xs text-slate-400">Character ID: {teamQuery.data.character_id}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">닉네임 설정 후 입장하면 팀 정보가 표시됩니다.</p>
            )}
            {message ? <p className="text-xs text-slate-300">{message}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vote Terminal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessionQuery.data ? (
              <>
                <p className="rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200">
                  {sessionQuery.data.scenarios?.description ?? "No scenario description."}
                </p>
                <p className="text-xs text-cyan-300">{phaseHelp}</p>
              </>
            ) : (
              <p className="rounded-md border border-dashed border-slate-700 p-3 text-xs text-slate-400">
                Join with session code to access scenario details.
              </p>
            )}

            <div className="space-y-2">
              <Input
                placeholder="Target team ID for vote"
                value={submission.culprit}
                onChange={(event) => setSubmission((prev) => ({ ...prev, culprit: event.target.value }))}
              />
            </div>
            <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || !teamId}>
              <Send className="mr-2 h-4 w-4" />
              Submit Vote
            </Button>

            <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
              <p className="mb-1 flex items-center gap-1 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                Classroom Safety Notice
              </p>
              <p>Use age-appropriate fictional content only. No graphic violence or personal targeting.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-100">Player Session Room</h2>
          <p className="text-sm text-slate-400">
            Join a session with join code, set your nickname, get a random team assignment, and submit your vote.
          </p>
        </div>
        {body}
      </main>
    </div>
  );
}
