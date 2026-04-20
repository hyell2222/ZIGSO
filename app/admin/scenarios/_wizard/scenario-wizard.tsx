"use client";

/**
 * 시나리오 생성/수정 공용 마법사.
 *
 * - create 모드: 빈 상태로 시작 → createScenario 호출 후 목록으로 이동
 * - edit 모드: initialDraft 로 채워서 시작 → updateScenario 호출 후 목록으로 이동
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/api/auth";
import {
  createScenario,
  updateScenario,
  type ScenarioCharacterInput,
  type ScenarioClueInput,
  type ScenarioLocationInput,
} from "@/lib/api/scenarios";
import { listPropAssets } from "@/lib/api/storage-props";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

import { AIGenerateModal } from "../create/steps/ai-generate-modal";
import { BasicInfoStep, type Difficulty } from "../create/steps/basic-info-step";
import { CharactersStep } from "../create/steps/characters-step";
import { MapEditorStep } from "../create/steps/map-editor-step";
import {
  RESOLUTION_LOCATION_TEMP_ID,
  type DraftCharacter,
  type DraftClue,
} from "../create/steps/types";

type StepIndex = 0 | 1 | 2;

const STEP_LABELS = ["기본 정보", "캐릭터", "맵 에디터"] as const;

function makeTempId() {
  return Math.random().toString(36).slice(2, 10);
}

function locationNameFor(character: DraftCharacter) {
  return `${character.name}의 장소`;
}

export type ScenarioDraft = {
  title: string;
  description: string;
  difficulty: Difficulty;
  characters: DraftCharacter[];
  /**
   * 캐릭터 장소 단서 + 사건 해결 정답 장소 단서를 한 배열에 담는다.
   * 정답 장소 단서는 characterTempId === RESOLUTION_LOCATION_TEMP_ID 로 구분된다.
   */
  clues: DraftClue[];
  /**
   * 사건 해결 단계 정답 장소 이름 (학생이 정확히 입력해야 맵이 열림).
   * 빈 문자열이면 정답 장소 없음 — 미션/타깃/잠금 정보도 의미 없음.
   */
  resolutionLocationName: string;
  /** 미션 설명 (예: "보물상자 열기") — 학생에게 목표로 표시된다 */
  resolutionMission: string;
  // 2단계 정답(prop) / 3단계 잠금 해제 아이템 표식은 DraftClue 자체의 플래그로 관리한다.
};

type Props =
  | {
      mode: "create";
      pageTitle?: string;
    }
  | {
      mode: "edit";
      scenarioId: string;
      initialDraft: ScenarioDraft;
      pageTitle?: string;
    };

export function ScenarioWizard(props: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<StepIndex>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const initial: ScenarioDraft =
    props.mode === "edit"
      ? props.initialDraft
      : {
          title: "",
          description: "",
          difficulty: "Normal",
          characters: [],
          clues: [],
          resolutionLocationName: "",
          resolutionMission: "",
        };

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [difficulty, setDifficulty] = useState<Difficulty>(initial.difficulty);
  const [characters, setCharacters] = useState<DraftCharacter[]>(initial.characters);
  const [clues, setClues] = useState<DraftClue[]>(initial.clues);
  const [resolutionLocationName, setResolutionLocationName] = useState(
    initial.resolutionLocationName,
  );
  const [resolutionMission, setResolutionMission] = useState(initial.resolutionMission);

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

  /* ---------------- character/clue mutations ---------------- */

  const handleAddCharacter = useCallback((input: Omit<DraftCharacter, "tempId">) => {
    setCharacters((prev) => [...prev, { tempId: makeTempId(), ...input }]);
  }, []);

  const handleRemoveCharacter = useCallback((tempId: string) => {
    setCharacters((prev) => prev.filter((c) => c.tempId !== tempId));
    // 정답 장소 단서(RESOLUTION_LOCATION_TEMP_ID)는 캐릭터 삭제와 무관하게 유지된다.
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

  /**
   * 시나리오 전체에서 단 하나의 clue 만 정답 prop 표식을 갖도록 토글한다.
   * tempId 가 null 이면 모든 clue 의 표식을 끈다.
   */
  const handleSetResolutionTarget = useCallback((tempId: string | null) => {
    setClues((prev) =>
      prev.map((c) => ({
        ...c,
        isResolutionTarget: c.tempId === tempId,
      })),
    );
  }, []);

  /**
   * 잠금 해제 아이템 표식 토글. 켜기 시도 시 이미 3개가 켜져 있으면 무시한다 (UI 가 강제).
   */
  const handleToggleResolutionUnlockItem = useCallback(
    (tempId: string, value: boolean) => {
      setClues((prev) => {
        if (value) {
          const currentlyOn = prev.filter((c) => c.isResolutionUnlockItem).length;
          const target = prev.find((c) => c.tempId === tempId);
          if (target?.isResolutionUnlockItem) return prev;
          if (currentlyOn >= 3) return prev;
        }
        return prev.map((c) =>
          c.tempId === tempId ? { ...c, isResolutionUnlockItem: value } : c,
        );
      });
    },
    [],
  );

  /* ---------------- AI generate ---------------- */

  const hasExistingDraft =
    title.trim().length > 0 ||
    description.trim().length > 0 ||
    characters.length > 0 ||
    clues.length > 0;

  const handleOpenAiModal = useCallback(() => {
    if (
      hasExistingDraft &&
      !window.confirm(
        "AI 가 생성한 결과로 현재 입력한 내용 (제목/설명/캐릭터/단서) 이 모두 대체됩니다. 계속할까요?",
      )
    ) {
      return;
    }
    setAiModalOpen(true);
  }, [hasExistingDraft]);

  const handleApplyAiResult = useCallback(
    (result: {
      title: string;
      description: string;
      difficulty: Difficulty;
      characters: DraftCharacter[];
      clues: DraftClue[];
    }) => {
      setErrorMessage(null);
      setTitle(result.title);
      setDescription(result.description);
      setDifficulty(result.difficulty);
      setCharacters(result.characters);
      setClues(result.clues);
      // AI 결과는 정답 장소 정보를 포함하지 않으므로 비워둔다.
      setResolutionLocationName("");
      setResolutionMission("");
      setStep(0);
    },
    [],
  );

  /* ---------------- save ---------------- */

  const buildPayload = useCallback(() => {
    const charactersInput: ScenarioCharacterInput[] = characters.map((c) => ({
      name: c.name,
      role: c.role,
    }));

    const locationsInput: ScenarioLocationInput[] = characters.map((c) => ({
      name: locationNameFor(c),
      character_name: c.name,
    }));

    const charactersByTempId = new Map(characters.map((c) => [c.tempId, c]));

    const toClueInput = (cl: DraftClue): ScenarioClueInput => {
      const owner = charactersByTempId.get(cl.characterTempId);
      return {
        name: cl.name,
        content: cl.content,
        // 정답 장소 단서는 location_name 을 비워두면 API 가 resolution_location_id 로 매칭한다.
        location_name: owner ? locationNameFor(owner) : undefined,
        props: {
          x: Math.round(cl.x),
          y: Math.round(cl.y),
          asset: cl.asset,
          w: Math.round(cl.w),
          h: Math.round(cl.h),
        },
        is_resolution_target: cl.isResolutionTarget === true,
        is_resolution_unlock_item: cl.isResolutionUnlockItem === true,
      };
    };

    const characterClues = clues.filter(
      (cl) => cl.characterTempId !== RESOLUTION_LOCATION_TEMP_ID,
    );
    const resolutionClues = clues.filter(
      (cl) => cl.characterTempId === RESOLUTION_LOCATION_TEMP_ID,
    );

    const cluesInput: ScenarioClueInput[] = characterClues.map(toClueInput);
    const trimmedResolutionName = resolutionLocationName.trim();
    const resolutionLocation = trimmedResolutionName
      ? {
          name: trimmedResolutionName,
          mission: resolutionMission.trim() || null,
          clues: resolutionClues.map(toClueInput),
        }
      : null;

    return {
      title,
      description,
      character_count: characters.length,
      difficulty,
      characters: charactersInput,
      locations: locationsInput,
      clues: cluesInput,
      resolution_location: resolutionLocation,
    };
  }, [
    title,
    description,
    difficulty,
    characters,
    clues,
    resolutionLocationName,
    resolutionMission,
  ]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("제목을 입력해주세요.");
      if (!description.trim()) throw new Error("설명을 입력해주세요.");
      if (characters.length === 0) throw new Error("캐릭터를 한 명 이상 추가해주세요.");

      const payload = buildPayload();

      if (props.mode === "edit") {
        await updateScenario(props.scenarioId, payload);
      } else {
        await createScenario({
          ...payload,
          creator_id: sessionQuery.data?.user.id ?? null,
        });
      }
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

  const pageTitle =
    props.pageTitle ?? (props.mode === "edit" ? "시나리오 수정" : "시나리오 만들기");

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
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{pageTitle}</h1>
            <Stepper
              current={step}
              onSelect={(idx) => {
                setErrorMessage(null);
                setStep(idx);
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenAiModal}
            disabled={saveMutation.isPending}
          >
            <Sparkles className="mr-1 h-4 w-4" />
            AI로 생성하기
          </Button>
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
            resolutionLocationName={resolutionLocationName}
            onChangeResolutionLocationName={setResolutionLocationName}
            resolutionMission={resolutionMission}
            onChangeResolutionMission={setResolutionMission}
            onSetResolutionTarget={handleSetResolutionTarget}
            onToggleResolutionUnlockItem={handleToggleResolutionUnlockItem}
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
            disabled={step === 0 || saveMutation.isPending}
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
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              저장
            </Button>
          )}
        </footer>
      </main>

      <AIGenerateModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        propAssets={(propAssetsQuery.data ?? []).map((a) => a.asset)}
        initialDifficulty={difficulty}
        onApply={handleApplyAiResult}
      />
    </div>
  );
}

function Stepper({
  current,
  onSelect,
}: {
  current: StepIndex;
  onSelect: (idx: StepIndex) => void;
}) {
  return (
    <ol
      role="tablist"
      aria-label="시나리오 단계"
      className="flex items-center gap-3 text-xs text-[var(--muted-foreground,#94a3b8)]"
    >
      {STEP_LABELS.map((label, idx) => {
        const active = idx === current;
        const done = idx < current;
        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(idx as StepIndex)}
              className="group flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-[rgba(36,40,43,0.85)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0"
            >
              <span
                className={
                  "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] " +
                  (active
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[#0f172a]"
                    : done
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--muted-foreground,#94a3b8)] group-hover:border-[var(--accent)]/60")
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
                      : "group-hover:text-[var(--foreground)]"
                }
              >
                {label}
              </span>
            </button>
            {idx < STEP_LABELS.length - 1 ? (
              <span className="mx-1 h-px w-6 bg-[var(--border)]" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
