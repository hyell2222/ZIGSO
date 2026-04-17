"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getCurrentSession } from "@/lib/api/auth";
import { createScenario } from "@/lib/api/scenarios";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/lib/routes";
import { parseScenarioIncident } from "@/lib/scenario-incident";
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
      const parsedIncident = incident.trim()
        ? parseScenarioIncident(JSON.parse(incident) as Record<string, unknown>)
        : null;
      const parsedCharacters = characters.trim() ? (JSON.parse(characters) as Record<string, unknown>[]) : [];
      const parsedLocations = locations.trim() ? (JSON.parse(locations) as Record<string, unknown>[]) : [];
      const parsedClues = clues.trim() ? (JSON.parse(clues) as Record<string, unknown>[]) : [];

      if (incident.trim() && !parsedIncident) {
        throw new Error("Incident must match the expected JSON object shape.");
      }
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
          <section className="space-y-4 rounded-md border border-[var(--border)] bg-[rgba(36,40,43,0.55)] p-4">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Create Scenario</h1>
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
              placeholder={`Incident JSON, e.g. {\n  "victim": {\n    "name": "한지우",\n    "age": 52,\n    "gender": "여성",\n    "occupation": "도서관 사서"\n  },\n  "discovery": {\n    "time": "오후 9시 10분",\n    "location": "본관 2층 도서관 서가 사이",\n    "appearance": "머리에 혈흔을 흘린 채 뒤로 넘어져 있음"\n  },\n  "estimated_death_time": "오후 8시 45분 ~ 9시 05분",\n  "summary": "야간 점검을 나갔던 사서가 연락이 두절된 후, 차갑게 식은 상태로 발견됨."\n}`}
            />
            <Textarea
              value={solution}
              onChange={(event) => setSolution(event.target.value)}
              placeholder="Scenario solution"
            />
            <Textarea
              value={characters}
              onChange={(event) => setCharacters(event.target.value)}
              placeholder='Characters JSON array, e.g. [{"name":"한지우","role":"학생회장","is_culprit":true,"alibi":{"timeline":[{"time":"20:35","behavior":"참고서를 가방에 숨기고 나갈 준비를 함","location":"학생회실"}],"fake_alibi":[{"time":"20:35","behavior":"학생회 예산 결산안을 검토하며 서류 정리 중이었음","location":"학생회실"}]},"information":{}}]'
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
            {message ? <p className="text-xs text-[var(--foreground)]">{message}</p> : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
