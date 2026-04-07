"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";
import { Textarea } from "@/components/ui/textarea";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

const TEAM_TEMPLATES = [
  [
    "Baek Jin-su (eldest son, 45)",
    "Ambitious heir with heavy gambling debt; furious after learning he was excluded from the will.",
  ],
  [
    "Baek Mi-na (second daughter, 38)",
    "Luxury-loving celebrity seeking parental approval; planned to steal a hidden slush-fund ledger.",
  ],
  [
    "Kim Do-yoon (secretary, 32)",
    "Quiet and capable aide; actually an undercover journalist investigating corporate corruption.",
  ],
  [
    "Dr. Choi Hyun-seo (physician, 50)",
    "Longtime doctor and friend with a struggling hospital; concealed dementia diagnosis and manipulated medication.",
  ],
  [
    "Lee Su-yeon (maid, 26)",
    "Nervous but diligent employee; her father was wrongfully jailed in a case tied to the chairman.",
  ],
  [
    "Jung Hae-il (lawyer, 55)",
    "Cold legal counsel who ignored instructions to revise the chairman's will.",
  ],
  [
    "Park Man-sik (gardener, 60)",
    "Quiet caretaker who knows every corner of the mansion; blackmailed the chairman over an illegitimate-child secret.",
  ],
] as const;

type TeamDraft = {
  name: string;
  role: string;
  story: string;
  alibi: string;
  evidence: string;
};

type GeneratedDraft = {
  title: string;
  publicBriefing: string;
  teams: TeamDraft[];
};

function generateCode(length: number) {
  return Math.random().toString(36).slice(2, 2 + length).toUpperCase();
}

export default function AdminCreateProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState("The Blue Rose Mansion on a stormy night");
  const [studentCount, setStudentCount] = useState(24);
  const [teamCount, setTeamCount] = useState(7);
  const [sessionMinutes, setSessionMinutes] = useState(70);
  const [gradeLevel, setGradeLevel] = useState("High school / university");
  const [teacherNotes, setTeacherNotes] = useState(
    "Closed-circle mystery. Include timeline clues: 20:00 study entry, 21:30 eldest son near study, 22:15 blackout (5 min), 23:00 physician blocked by locked door, 08:00 body found. Include evidence: fishing line at door, sleeping pill in coffee, torn will about donating assets, bloodstained handkerchief with M.S initials, hidden passage behind bookshelf.",
  );
  const [generatedDraft, setGeneratedDraft] = useState<GeneratedDraft | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<string>("synopsis");

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

  const generateScenarioMutation = useMutation({
    mutationFn: async () => {
      const safeTeamCount = Math.max(2, Math.min(teamCount, 8));
      const safeStudentCount = Math.max(2, studentCount);
      const prompt = [
        `Create a school-safe murder mystery case for ${gradeLevel}.`,
        `Theme: ${theme}.`,
        `Total students: ${safeStudentCount}.`,
        `Number of teams: ${safeTeamCount}.`,
        `Session duration: ${sessionMinutes} minutes.`,
        `Teacher notes: ${teacherNotes}.`,
        "Return a compelling title, a public briefing, and team role briefs.",
      ].join(" ");

      let data: Record<string, unknown> | null = null;
      const { data: aiData, error } = await supabase.functions.invoke("generate-mystery-case", {
        body: { prompt },
      });
      if (!error) data = aiData as Record<string, unknown>;

      const fallbackTitle = "Stormy Night at Blue Rose Mansion";
      const title = typeof data?.title === "string" ? data.title : fallbackTitle;
      const publicBriefingValue =
        typeof data?.publicBriefing === "string"
          ? data.publicBriefing
          : typeof data?.public_briefing === "string"
            ? data.public_briefing
            : null;
      const publicBriefing =
        publicBriefingValue ??
        "At Chairman Baek Kang-ho's 70th birthday gathering in an isolated mountain mansion, a storm destroys the only bridge and all communication. By morning, he is found dead in a locked study beside torn will fragments.";
      const aiTeams = Array.isArray(data?.teams) ? data.teams : [];
      const fallbackTeams = TEAM_TEMPLATES.slice(0, Math.max(2, Math.min(teamCount, 8))).map(
        ([name, role]) => ({
          name,
          role,
          story: role,
          alibi: "사건 시간대의 행적을 설명할 알리바이가 필요하다.",
          evidence: "증거물과의 관련성을 조사해 정리한다.",
        }),
      );
      const normalizedTeams = (aiTeams
        .map((team) => {
          if (!team || typeof team !== "object") return null;
          const rawName = "name" in team ? team.name : "";
          const rawRole = "role" in team ? team.role : "";
          const rawBriefing = "private_briefing" in team ? team.private_briefing : "";
          const name = typeof rawName === "string" && rawName.trim() ? rawName : "Team";
          const role = typeof rawRole === "string" && rawRole.trim() ? rawRole : "Investigators";
          const story = typeof rawBriefing === "string" && rawBriefing.trim() ? rawBriefing : role;
          const rawAlibi = "alibi" in team ? team.alibi : "";
          const rawEvidence = "evidence" in team ? team.evidence : "";
          const alibi =
            typeof rawAlibi === "string" && rawAlibi.trim()
              ? rawAlibi
              : "사건 시간대의 행적을 설명할 알리바이가 필요하다.";
          const evidence =
            typeof rawEvidence === "string" && rawEvidence.trim()
              ? rawEvidence
              : "증거물과의 관련성을 조사해 정리한다.";
          return { name, role, story, alibi, evidence };
        })
        .filter(Boolean) as TeamDraft[])
        .slice(0, Math.max(2, Math.min(teamCount, 8)));

      return { title, publicBriefing, teams: normalizedTeams.length ? normalizedTeams : fallbackTeams };
    },
    onSuccess: (data) => {
      setGeneratedDraft(data);
      setActiveResultTab("synopsis");
      setMessage("Scenario generated. Review and edit before creating.");
    },
    onError: (error) => setMessage(error.message),
  });

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (!generatedDraft) throw new Error("Generate a scenario first.");
      const classroomCode = generateCode(6);
      const { data: game, error: insertError } = await supabase
        .from("games")
        .insert({
          title: generatedDraft.title,
          phase: "briefing",
          grade_level: gradeLevel,
          classroom_code: classroomCode,
          public_briefing: generatedDraft.publicBriefing,
          ai_case_payload: { theme, studentCount, teamCount: generatedDraft.teams.length, sessionMinutes, teacherNotes, generatedDraft },
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      const teams = generatedDraft.teams.map((team) => ({
        game_id: game.id,
        name: team.name,
        role: team.role,
        private_briefing: [team.story, `Alibi: ${team.alibi}`, `Evidence: ${team.evidence}`].join("\n\n"),
        access_code: generateCode(5),
      }));
      const { error: teamError } = await supabase.from("teams").insert(teams);
      if (teamError) throw teamError;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-games"] });
      router.push(ROUTES.admin.projects);
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
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-slate-100">Create Game Project</h1>
            <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
              <section className="space-y-3 rounded-md border border-slate-800 p-4">
                <Input value={theme} onChange={(event) => setTheme(event.target.value)} placeholder="Theme" />
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input type="number" min={2} value={studentCount} onChange={(event) => setStudentCount(Number(event.target.value) || 2)} placeholder="Students" />
                  <Input type="number" min={2} max={8} value={teamCount} onChange={(event) => setTeamCount(Number(event.target.value) || 2)} placeholder="Teams" />
                  <Input type="number" min={10} value={sessionMinutes} onChange={(event) => setSessionMinutes(Number(event.target.value) || 45)} placeholder="Minutes" />
                </div>
                <Input value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} placeholder="Grade level" />
                <Textarea value={teacherNotes} onChange={(event) => setTeacherNotes(event.target.value)} placeholder="Extra constraints or teaching goals" />
                <Button onClick={() => generateScenarioMutation.mutate()} disabled={generateScenarioMutation.isPending}>
                  {generateScenarioMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate
                </Button>
              </section>

              {generatedDraft ? (
                <section className="space-y-3 rounded-md border border-slate-800 p-4">
                  <p className="text-xs text-cyan-300">Generated result</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant={activeResultTab === "synopsis" ? "default" : "secondary"} onClick={() => setActiveResultTab("synopsis")}>Synopsis</Button>
                    {generatedDraft.teams.map((team, index) => (
                      <Button key={`${team.name}-${index}-tab`} variant={activeResultTab === `role-${index}` ? "default" : "secondary"} onClick={() => setActiveResultTab(`role-${index}`)}>
                        Role {index + 1}
                      </Button>
                    ))}
                  </div>
                  {activeResultTab === "synopsis" ? (
                    <div className="space-y-2">
                      <Input value={generatedDraft.title} onChange={(event) => setGeneratedDraft((prev) => (prev ? { ...prev, title: event.target.value } : prev))} placeholder="Case title" />
                      <Textarea value={generatedDraft.publicBriefing} onChange={(event) => setGeneratedDraft((prev) => (prev ? { ...prev, publicBriefing: event.target.value } : prev))} placeholder="Synopsis" />
                    </div>
                  ) : (
                    (() => {
                      const index = Number(activeResultTab.replace("role-", ""));
                      const team = generatedDraft.teams[index];
                      if (!team) return null;
                      return (
                        <div className="space-y-2">
                          <Input value={team.name} onChange={(event) => setGeneratedDraft((prev) => (prev ? { ...prev, teams: prev.teams.map((t, i) => (i === index ? { ...t, name: event.target.value } : t)) } : prev))} placeholder="Role/character name" />
                          <Input value={team.role} onChange={(event) => setGeneratedDraft((prev) => (prev ? { ...prev, teams: prev.teams.map((t, i) => (i === index ? { ...t, role: event.target.value } : t)) } : prev))} placeholder="Role summary" />
                          <Textarea value={team.story} onChange={(event) => setGeneratedDraft((prev) => (prev ? { ...prev, teams: prev.teams.map((t, i) => (i === index ? { ...t, story: event.target.value } : t)) } : prev))} placeholder="Character story" />
                          <Textarea value={team.alibi} onChange={(event) => setGeneratedDraft((prev) => (prev ? { ...prev, teams: prev.teams.map((t, i) => (i === index ? { ...t, alibi: event.target.value } : t)) } : prev))} placeholder="Alibi" />
                          <Textarea value={team.evidence} onChange={(event) => setGeneratedDraft((prev) => (prev ? { ...prev, teams: prev.teams.map((t, i) => (i === index ? { ...t, evidence: event.target.value } : t)) } : prev))} placeholder="Evidence" />
                        </div>
                      );
                    })()
                  )}
                </section>
              ) : null}
            </div>
            {message ? <p className="text-xs text-slate-300">{message}</p> : null}
            <div className="flex justify-end">
              <Button onClick={() => createProjectMutation.mutate()} disabled={!generatedDraft || createProjectMutation.isPending}>
                {createProjectMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Game
              </Button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
