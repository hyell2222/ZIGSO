"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getCurrentSession } from "@/lib/api/auth";
import { createScenario } from "@/lib/api/scenarios";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

export default function AdminScenarioCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("hard");
  const [incident, setIncident] = useState("");
  const [solution, setSolution] = useState("");
  const [characters, setCharacters] = useState("");
  const [locations, setLocations] = useState("");
  const [clues, setClues] = useState("");

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

  const createScenarioMutation = useMutation({
    mutationFn: async () => {
      const parsedIncident = incident.trim() ? (JSON.parse(incident) as Record<string, unknown>) : null;
      const parsedCharacters = characters.trim() ? (JSON.parse(characters) as Record<string, unknown>[]) : [];
      const parsedLocations = locations.trim() ? (JSON.parse(locations) as Record<string, unknown>[]) : [];
      const parsedClues = clues.trim() ? (JSON.parse(clues) as Record<string, unknown>[]) : [];

      if (!Array.isArray(parsedCharacters)) {
        throw new Error("Characters must be a JSON array.");
      }
      if (!Array.isArray(parsedLocations)) {
        throw new Error("Locations must be a JSON array.");
      }
      if (!Array.isArray(parsedClues)) {
        throw new Error("Clues must be a JSON array.");
      }

      await createScenario({
        title,
        description,
        character_count: parsedCharacters.length,
        difficulty,
        incident: parsedIncident,
        solution,
        characters: parsedCharacters,
        locations: parsedLocations,
        clues: parsedClues,
        creator_id: sessionQuery.data?.user.id ?? null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-scenarios"] });
      router.push(ROUTES.admin.scenarios);
    },
    onError: (error) => setMessage(error.message),
  });

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-4">
        </div>
        {sessionQuery.data ? (
          <section className="space-y-4 rounded-md border border-slate-800 p-4">
            <h1 className="text-2xl font-bold text-slate-100">Create Scenario</h1>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Scenario title" />
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Scenario description"
            />
            <Input
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              placeholder="Difficulty"
            />
            <Textarea
              value={incident}
              onChange={(event) => setIncident(event.target.value)}
              placeholder='Incident JSON, e.g. {"summary":"...","victim":"..."}'
            />
            <Textarea
              value={solution}
              onChange={(event) => setSolution(event.target.value)}
              placeholder="Scenario solution"
            />
            <Textarea
              value={characters}
              onChange={(event) => setCharacters(event.target.value)}
              placeholder='Characters JSON array, e.g. [{"name":"Alex","role":"Witness","alibi":"...","information":{},"motive":{}}]'
            />
            <Textarea
              value={locations}
              onChange={(event) => setLocations(event.target.value)}
              placeholder='Locations JSON array, e.g. [{"name":"Library","information":{"floor":2}}]'
            />
            <Textarea
              value={clues}
              onChange={(event) => setClues(event.target.value)}
              placeholder='Clues JSON array, e.g. [{"name":"Note","information":{"text":"..."}, "character_name":"Alex","location_name":"Library"}]'
            />
            <Button
              onClick={() => createScenarioMutation.mutate()}
              disabled={createScenarioMutation.isPending || !title.trim() || !description.trim() || !characters.trim()}
            >
              {createScenarioMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Scenario
            </Button>
            {message ? <p className="text-xs text-slate-300">{message}</p> : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
