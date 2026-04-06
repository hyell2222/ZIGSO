"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, Sparkles, Timer, Users } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GamePhase } from "@/lib/types";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

const PHASES: GamePhase[] = ["briefing", "evidence", "interrogation", "deduction", "verdict"];

type AuthView = "sign-in" | "dashboard";

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const [authView, setAuthView] = useState<AuthView>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [scenarioPrompt, setScenarioPrompt] = useState(
    "Generate a school-safe cyberpunk mystery for 11th grade students with four teams and conflicting motives.",
  );

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    enabled: hasSupabaseEnv,
  });

  const gamesQuery = useQuery({
    queryKey: ["admin-games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id,title,phase,classroom_code,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(sessionQuery.data),
  });

  const activeGame = useMemo(
    () => gamesQuery.data?.find((game) => game.id === selectedGameId),
    [gamesQuery.data, selectedGameId],
  );

  const signInMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    onSuccess: async () => {
      setMessage("Teacher session connected.");
      setAuthView("dashboard");
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
    },
    onError: (error) => setMessage(error.message),
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      setAuthView("sign-in");
      setMessage("Session closed.");
    },
    onError: (error) => setMessage(error.message),
  });

  const createAiScenarioMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-mystery-case", {
        body: { prompt: scenarioPrompt },
      });
      if (error) throw error;

      const fallbackTitle = "Operation Neon Echo";
      const title = data?.title ?? fallbackTitle;
      const publicBriefing =
        data?.publicBriefing ??
        "A faculty member was found unconscious in the digital media lab after hours. The room was sealed from inside. Teams must reconstruct timeline, motive, and method.";
      const aiCasePayload = data ?? null;
      const classroomCode = Math.random().toString(36).slice(2, 8).toUpperCase();

      const { data: game, error: insertError } = await supabase
        .from("games")
        .insert({
          title,
          phase: "briefing",
          grade_level: "high-school-2nd",
          classroom_code: classroomCode,
          public_briefing: publicBriefing,
          ai_case_payload: aiCasePayload,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      const teams = [
        ["Signal Analysts", "Analyze digital evidence and camera logs."],
        ["Bio-Forensics Unit", "Interpret forensic anomalies and scene traces."],
        ["Witness Interrogation Desk", "Cross-check statements and contradictions."],
        ["Internal Affairs", "Investigate hidden motives and institutional secrets."],
      ].map(([name, role]) => ({
        game_id: game.id,
        name,
        role,
        private_briefing: `${name}: ${role}`,
        access_code: Math.random().toString(36).slice(2, 7).toUpperCase(),
      }));

      const { error: teamError } = await supabase.from("teams").insert(teams);
      if (teamError) throw teamError;
    },
    onSuccess: async () => {
      setMessage("New AI-assisted case created.");
      await queryClient.invalidateQueries({ queryKey: ["admin-games"] });
    },
    onError: (error) => setMessage(error.message),
  });

  const advancePhaseMutation = useMutation({
    mutationFn: async () => {
      if (!activeGame) return;
      const nextIndex = Math.min(PHASES.indexOf(activeGame.phase) + 1, PHASES.length - 1);
      const { error } = await supabase
        .from("games")
        .update({ phase: PHASES[nextIndex] })
        .eq("id", activeGame.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setMessage("Game phase advanced.");
      await queryClient.invalidateQueries({ queryKey: ["admin-games"] });
    },
    onError: (error) => setMessage(error.message),
  });

  if (!hasSupabaseEnv) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Supabase Configuration Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-300">
          <p>Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.</p>
          <p>
            This project is static-export compatible: teacher security is enforced by Supabase Auth and
            Row Level Security policies, not server sessions.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isSignedIn = Boolean(sessionQuery.data) || authView === "dashboard";

  if (!isSignedIn) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Teacher Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              signInMutation.mutate();
            }}
          >
            <Input
              type="email"
              placeholder="teacher@school.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <Button className="w-full" disabled={signInMutation.isPending}>
              {signInMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
            {message ? <p className="text-xs text-slate-300">{message}</p> : null}
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>AI Case Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-300">
            Generate a classroom-safe mystery scenario. If the Edge Function is unavailable, a fallback
            template case is still created.
          </p>
          <Textarea value={scenarioPrompt} onChange={(event) => setScenarioPrompt(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => createAiScenarioMutation.mutate()} disabled={createAiScenarioMutation.isPending}>
              {createAiScenarioMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Mystery Case
            </Button>
            <Button variant="secondary" onClick={() => signOutMutation.mutate()} disabled={signOutMutation.isPending}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
          {message ? <p className="text-xs text-slate-300">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Classroom Control Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-400">
            Select a game and move the class through structured deduction phases in realtime.
          </p>
          <select
            className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
            onChange={(event) => setSelectedGameId(event.target.value)}
            value={selectedGameId}
          >
            <option value="">Select game</option>
            {gamesQuery.data?.map((game) => (
              <option key={game.id} value={game.id}>
                {game.title} ({game.classroom_code})
              </option>
            ))}
          </select>
          {activeGame ? (
            <div className="space-y-2 rounded-md border border-slate-800 p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-100">{activeGame.title}</p>
                <Badge>{activeGame.phase}</Badge>
              </div>
              <p className="text-xs text-slate-400">Room Code: {activeGame.classroom_code}</p>
              <Button onClick={() => advancePhaseMutation.mutate()} disabled={advancePhaseMutation.isPending}>
                <Timer className="mr-2 h-4 w-4" />
                Advance Phase
              </Button>
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-700 p-3 text-xs text-slate-400">
              No game selected.
            </p>
          )}
          <div className="rounded-md border border-slate-800 p-3 text-xs text-slate-300">
            <p className="mb-1 flex items-center gap-1 font-semibold text-cyan-300">
              <Users className="h-3.5 w-3.5" />
              Student Access URL
            </p>
            <p>/play (students join with team access code)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
