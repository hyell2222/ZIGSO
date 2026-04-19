"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/api/auth";
import {
  createScenario,
  type ScenarioCharacterInput,
  type ScenarioClueInput,
  type ScenarioLocationInput,
} from "@/lib/api/scenarios";
import { listPropAssets } from "@/lib/api/storage-props";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

import { BasicInfoStep, type Difficulty } from "./_steps/basic-info-step";
import { CharactersStep } from "./_steps/characters-step";
import { MapEditorStep } from "./_steps/map-editor-step";
import type { DraftCharacter, DraftClue } from "./_steps/types";

type StepIndex = 0 | 1 | 2;

const STEP_LABELS = ["기본 정보", "캐릭터", "맵 에디터"] as const;

function makeTempId() {
  return Math.random().toString(36).slice(2, 10);
}

function roomNameFor(character: DraftCharacter) {
  return `${character.name}의 방`;
}

export default function AdminScenarioCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<StepIndex>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Normal");
  const [characters, setCharacters] = useState<DraftCharacter[]>([]);
  const [clues, setClues] = useState<DraftClue[]>([]);

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

  const propAssetsQuery = useQuery({
    queryKey: ["prop-assets"],
    queryFn: listPropAssets,
    staleTime: 5 * 60 * 1000,
  });

  /* ---------------- mutations ---------------- */

  const handleAddCharacter = useCallback((input: Omit<DraftCharacter, "tempId">) => {
    setCharacters((prev) => [...prev, { tempId: makeTempId(), ...input }]);
  }, []);

  const handleRemoveCharacter = useCallback((tempId: string) => {
    setCharacters((prev) => prev.filter((c) => c.tempId !== tempId));
    setClues((prev) => prev.filter((c) => c.characterTempId !== tempId));
  }, []);

  const handleAddClue = useCallback((clue: Omit<DraftClue, "tempId">) => {
    const tempId = makeTempId();
    setClues((prev) => [...prev, { tempId, ...clue }]);
    return tempId;
  }, []);

  const handleUpdateClue = useCallback((tempId: string, patch: Partial<DraftClue>) => {
    setClues((prev) => prev.map((c) => (c.tempId === tempId ? { ...c, ...patch } : c)));
  }, []);

  const handleRemoveClue = useCallback((tempId: string) => {
    setClues((prev) => prev.filter((c) => c.tempId !== tempId));
  }, []);

  /* ---------------- save ---------------- */

  const createScenarioMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("제목을 입력해주세요.");
      if (!description.trim()) throw new Error("설명을 입력해주세요.");
      if (characters.length === 0) throw new Error("캐릭터를 한 명 이상 추가해주세요.");

      const charactersInput: ScenarioCharacterInput[] = characters.map((c) => ({
        name: c.name,
        role: c.role,
      }));

      const locationsInput: ScenarioLocationInput[] = characters.map((c) => ({
        name: roomNameFor(c),
        character_name: c.name,
      }));

      const charactersByTempId = new Map(characters.map((c) => [c.tempId, c]));

      const cluesInput: ScenarioClueInput[] = clues.map((cl) => {
        const owner = charactersByTempId.get(cl.characterTempId);
        return {
          name: cl.name,
          content: cl.content,
          location_name: owner ? roomNameFor(owner) : undefined,
          props: {
            x: Math.round(cl.x),
            y: Math.round(cl.y),
            asset: cl.asset,
            w: Math.round(cl.w),
            h: Math.round(cl.h),
          },
        };
      });

      await createScenario({
        title,
        description,
        character_count: characters.length,
        difficulty,
        characters: charactersInput,
        locations: locationsInput,
        clues: cluesInput,
        creator_id: sessionQuery.data?.user.id ?? null,
      });
    },
    onMutate: () => setErrorMessage(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-scenarios"] });
      router.push(ROUTES.admin.scenarios);
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  /* ---------------- step navigation ---------------- */

  const canGoNext = useMemo(() => {
    if (step === 0) return title.trim().length > 0 && description.trim().length > 0;
    if (step === 1) return characters.length > 0;
    return false;
  }, [step, title, description, characters.length]);

  const goNext = () => {
    if (!canGoNext) return;
    setErrorMessage(null);
    setStep((s) => (Math.min(2, s + 1) as StepIndex));
  };

  const goPrev = () => {
    setErrorMessage(null);
    setStep((s) => (Math.max(0, s - 1) as StepIndex));
  };

  /* ---------------- render ---------------- */

  if (!sessionQuery.data) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">시나리오 만들기</h1>
          <Stepper current={step} />
        </header>

        {step === 0 ? (
          <BasicInfoStep
            title={title}
            description={description}
            difficulty={difficulty}
            onChangeTitle={setTitle}
            onChangeDescription={setDescription}
            onChangeDifficulty={setDifficulty}
          />
        ) : null}

        {step === 1 ? (
          <CharactersStep
            characters={characters}
            onAdd={handleAddCharacter}
            onRemove={handleRemoveCharacter}
          />
        ) : null}

        {step === 2 ? (
          <MapEditorStep
            characters={characters}
            clues={clues}
            propAssets={propAssetsQuery.data ?? []}
            isLoadingAssets={propAssetsQuery.isLoading}
            onAddClue={handleAddClue}
            onUpdateClue={handleUpdateClue}
            onRemoveClue={handleRemoveClue}
          />
        ) : null}

        {errorMessage ? (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {errorMessage}
          </p>
        ) : null}

        <footer className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={goPrev}
            disabled={step === 0 || createScenarioMutation.isPending}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            이전
          </Button>

          {step < 2 ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              variant="default"
            >
              다음
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => createScenarioMutation.mutate()}
              disabled={createScenarioMutation.isPending}
            >
              {createScenarioMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              저장
            </Button>
          )}
        </footer>
      </main>
    </div>
  );
}

function Stepper({ current }: { current: StepIndex }) {
  return (
    <ol className="flex items-center gap-3 text-xs text-[var(--muted-foreground,#94a3b8)]">
      {STEP_LABELS.map((label, idx) => {
        const active = idx === current;
        const done = idx < current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={
                "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] " +
                (active
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[#0f172a]"
                  : done
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--muted-foreground,#94a3b8)]")
              }
            >
              {idx + 1}
            </span>
            <span
              className={
                active
                  ? "text-[var(--foreground)]"
                  : done
                    ? "text-[var(--accent)]"
                    : undefined
              }
            >
              {label}
            </span>
            {idx < STEP_LABELS.length - 1 ? (
              <span className="mx-1 h-px w-6 bg-[var(--border)]" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
