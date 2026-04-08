"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCcw, Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  getSessionByJoinCode,
  getSessionDetails,
  getTeamById,
  joinPlayerSession,
  listSessionTeams,
  submitVote,
} from "@/lib/api/play";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TeamSubmission } from "@/lib/types";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

const defaultSubmission: TeamSubmission = {
  culprit: "",
  motive: "",
  method: "",
  timeline: "",
};

export function PlayRoom() {
  const queryClient = useQueryClient();
  const [joinCode, setJoinCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
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

  const teamsQuery = useQuery({
    queryKey: ["play-session-teams", sessionId],
    queryFn: async () => listSessionTeams(sessionId as string),
    enabled: Boolean(sessionId),
  });

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${sessionId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["play-session", sessionId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient]);

  const joinMutation = useMutation({
    mutationFn: async () => {
      const normalizedJoinCode = joinCode.trim().toUpperCase();
      const session = await getSessionByJoinCode(normalizedJoinCode);
      setSessionId(session.id);
      setTeamId(null);
    },
    onSuccess: () => setMessage("Connected to session. Select your team."),
    onError: (error) => setMessage(error.message),
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId || !teamId) throw new Error("Select a team first.");
      if (!nickname.trim()) throw new Error("Enter your nickname.");
      await joinPlayerSession({
        session_id: sessionId,
        team_id: teamId,
        nickname: nickname.trim(),
      });
    },
    onSuccess: () => setMessage("Player joined successfully."),
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
    if (row.ended_at) return "This session has ended.";
    if (!row.phase_started_at) return "Wait for the teacher to start the game.";
    switch (row.phase) {
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

  if (!hasSupabaseEnv) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Setup Required</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-300">
          Add Supabase environment variables to run multiplayer classroom mode.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Session Join Console</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="space-y-3"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              joinMutation.mutate();
            }}
          >
            <Input
              placeholder="Session join code (e.g. A7K2QX)"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              required
            />
            <Input
              placeholder="Your nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={joinMutation.isPending}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Connect
            </Button>
          </form>
          {teamsQuery.data && teamsQuery.data.length > 0 ? (
            <select
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
              value={teamId ?? ""}
              onChange={(event) => setTeamId(event.target.value)}
            >
              <option value="">Select team</option>
              {teamsQuery.data.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          ) : null}
          <Button onClick={() => registerMutation.mutate()} disabled={registerMutation.isPending || !teamId}>
            Join as Player
          </Button>
          {teamQuery.data ? (
            <div className="rounded-md border border-slate-800 p-3 text-sm text-slate-200">
              <p className="font-semibold text-cyan-300">{teamQuery.data.name}</p>
              <p className="text-xs text-slate-400">Character ID: {teamQuery.data.character_id}</p>
            </div>
          ) : null}
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
  );
}
