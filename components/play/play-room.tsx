"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCcw, Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [classroomCode, setClassroomCode] = useState("");
  const [teamAccessCode, setTeamAccessCode] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [submission, setSubmission] = useState<TeamSubmission>(defaultSubmission);
  const [message, setMessage] = useState<string | null>(null);

  const teamQuery = useQuery({
    queryKey: ["play-team", teamId],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*").eq("id", teamId).single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(teamId),
  });

  const gameQuery = useQuery({
    queryKey: ["play-game", gameId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id,title,phase,public_briefing,classroom_code")
        .eq("id", gameId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(gameId),
  });

  useEffect(() => {
    if (!gameId) return;
    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["play-game", gameId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameId, queryClient]);

  const joinMutation = useMutation({
    mutationFn: async () => {
      const normalizedClassroomCode = classroomCode.trim().toUpperCase();
      const normalizedTeamCode = teamAccessCode.trim().toUpperCase();
      const { data: game, error: gameError } = await supabase
        .from("games")
        .select("id")
        .eq("classroom_code", normalizedClassroomCode)
        .single();
      if (gameError) throw gameError;

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("id,game_id")
        .eq("game_id", game.id)
        .eq("access_code", normalizedTeamCode)
        .single();
      if (teamError) throw teamError;

      setTeamId(team.id);
      setGameId(team.game_id);
    },
    onSuccess: () => setMessage("Connected to investigation room."),
    onError: (error) => setMessage(error.message),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!teamId || !gameId) throw new Error("Join a room first.");
      const { error } = await supabase.from("submissions").upsert({
        game_id: gameId,
        team_id: teamId,
        culprit: submission.culprit,
        motive: submission.motive,
        method: submission.method,
        timeline: submission.timeline,
      });
      if (error) throw error;
    },
    onSuccess: () => setMessage("Deduction report transmitted."),
    onError: (error) => setMessage(error.message),
  });

  const phaseHelp = useMemo(() => {
    switch (gameQuery.data?.phase) {
      case "briefing":
        return "Read the incident summary and identify key unknowns.";
      case "evidence":
        return "Organize clues and confirm what is fact vs assumption.";
      case "interrogation":
        return "Challenge other teams and resolve contradictions.";
      case "deduction":
        return "Lock your suspect, motive, method, and timeline.";
      case "verdict":
        return "Submit final report and prepare your defense.";
      default:
        return "Await teacher instructions.";
    }
  }, [gameQuery.data?.phase]);

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
          <CardTitle>Join Team Console</CardTitle>
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
              placeholder="Classroom code (e.g. A7K2QX)"
              value={classroomCode}
              onChange={(event) => setClassroomCode(event.target.value)}
              required
            />
            <Input
              placeholder="Team access code"
              value={teamAccessCode}
              onChange={(event) => setTeamAccessCode(event.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={joinMutation.isPending}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Connect
            </Button>
          </form>
          {teamQuery.data ? (
            <div className="rounded-md border border-slate-800 p-3 text-sm text-slate-200">
              <p className="font-semibold text-cyan-300">{teamQuery.data.name}</p>
              <p className="text-xs text-slate-400">{teamQuery.data.role}</p>
              <p className="mt-2 text-xs">{teamQuery.data.private_briefing}</p>
            </div>
          ) : null}
          {message ? <p className="text-xs text-slate-300">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deduction Terminal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {gameQuery.data ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{gameQuery.data.phase}</Badge>
                <p className="text-sm font-semibold text-slate-100">{gameQuery.data.title}</p>
              </div>
              <p className="rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200">
                {gameQuery.data.public_briefing}
              </p>
              <p className="text-xs text-cyan-300">{phaseHelp}</p>
            </>
          ) : (
            <p className="rounded-md border border-dashed border-slate-700 p-3 text-xs text-slate-400">
              Join with classroom/team code to access the case.
            </p>
          )}

          <div className="space-y-2">
            <Input
              placeholder="Who is the culprit?"
              value={submission.culprit}
              onChange={(event) => setSubmission((prev) => ({ ...prev, culprit: event.target.value }))}
            />
            <Input
              placeholder="What is the motive?"
              value={submission.motive}
              onChange={(event) => setSubmission((prev) => ({ ...prev, motive: event.target.value }))}
            />
            <Input
              placeholder="What method was used?"
              value={submission.method}
              onChange={(event) => setSubmission((prev) => ({ ...prev, method: event.target.value }))}
            />
            <Textarea
              placeholder="Timeline and reasoning"
              value={submission.timeline}
              onChange={(event) => setSubmission((prev) => ({ ...prev, timeline: event.target.value }))}
            />
          </div>
          <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || !teamId}>
            <Send className="mr-2 h-4 w-4" />
            Submit Report
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
