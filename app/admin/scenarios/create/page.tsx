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
  const [characterCount, setcharacterCount] = useState(5);
  const [difficulty, setDifficulty] = useState("hard");
  const [data, setData] = useState("");

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
      let parsedData: Record<string, unknown> = {};
      if (data.trim()) {
        parsedData = JSON.parse(data) as Record<string, unknown>;
      }
      // #region agent log
      fetch("http://127.0.0.1:7749/ingest/bf6ab18c-c394-4192-9205-66b8beb594f8", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "55cc55",
        },
        body: JSON.stringify({
          sessionId: "55cc55",
          runId: "empty-scenarios-pre-fix",
          hypothesisId: "H3",
          location: "app/admin/scenarios/create/page.tsx:50",
          message: "admin create scenario mutation",
          data: {
            sessionUserId: sessionQuery.data?.user.id ?? null,
            hasTitle: Boolean(title.trim()),
            hasDescription: Boolean(description.trim()),
            characterCount,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      await createScenario({
        title,
        description,
        character_count: characterCount,
        difficulty,
        data: parsedData,
        teacher_id: sessionQuery.data?.user.id ?? null,
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
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
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
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                type="number"
                min={2}
                value={characterCount}
                onChange={(event) => setcharacterCount(Number(event.target.value) || 2)}
                placeholder="Player count"
              />
              <Input
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                placeholder="Difficulty"
              />
            </div>
            <Textarea
              value={data}
              onChange={(event) => setData(event.target.value)}
              placeholder='Scenario JSON data, e.g. {"characters":[...],"solution":{...}}'
            />
            <Button
              onClick={() => createScenarioMutation.mutate()}
              disabled={createScenarioMutation.isPending || !title.trim() || !description.trim()}
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
