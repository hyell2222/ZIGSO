"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/api/auth";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth-session-query";
import {
  createCase,
  updateCase,
  type CaseClueInput,
  type CaseLocationInput,
} from "@/lib/api/cases";
import { listPropAssets } from "@/lib/api/storage-props";
import { mapPixelSizeFromAssetTiles } from "@/lib/map-prop-pixel-size";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";
import type { SuspectEntry } from "@/lib/suspects";
import { makeTempId } from "@/lib/temp-id";

import { AIGenerateModal } from "../new/steps/ai-generate-modal";
import { BasicInfoStep, type Difficulty } from "../new/steps/basic-info-step";
import { InvestigationZonesStep } from "../new/steps/investigation-zones-step";
import { MapEditorStep } from "../new/steps/map-editor-step";
import { SuspectsStep } from "../new/steps/suspects-step";
import { type DraftClue, type DraftInvestigationZone } from "../new/steps/types";

type StepIndex = 0 | 1 | 2 | 3;

const STEP_LABELS = ["기본 정보", "용의자 프로필", "조사 구역", "맵 에디터"] as const;

function locationNameFor(zone: DraftInvestigationZone) {
  return zone.zoneName.trim() || "미정 구역";
}

export type CaseDraft = {
  title: string;
  description: string;
  suspects: SuspectEntry[];
  answerSuspectId: string;
  difficulty: Difficulty;
  investigationZones: DraftInvestigationZone[];
  clues: DraftClue[];
};

type Props =
  | { mode: "create"; pageTitle?: string }
  | { mode: "edit"; caseId: string; initialDraft: CaseDraft; pageTitle?: string };

export function CaseWizard(props: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<StepIndex>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const initial: CaseDraft =
    props.mode === "edit"
      ? props.initialDraft
      : {
          title: "",
          description: "",
          suspects: [{ id: makeTempId(), name: "", detail: "" }],
          answerSuspectId: "",
          difficulty: "Normal",
          investigationZones: [{ tempId: makeTempId(), zoneName: "" }],
          clues: [],
        };

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [suspects, setSuspects] = useState<SuspectEntry[]>(initial.suspects);
  const [answerSuspectId, setAnswerSuspectId] = useState(initial.answerSuspectId);
  const [difficulty, setDifficulty] = useState<Difficulty>(initial.difficulty);
  const [investigationZones, setInvestigationZones] = useState<DraftInvestigationZone[]>(
    initial.investigationZones,
  );
  const [clues, setClues] = useState<DraftClue[]>(initial.clues);

  const sessionQuery = useQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      return getCurrentSession();
    },
  });

  useEffect(() => {
    if (sessionQuery.isLoading) return;
    if (sessionQuery.isFetching && !sessionQuery.data) return;
    if (!hasSupabaseEnv) {
      router.replace(ROUTES.admin.login);
      return;
    }
    if (!sessionQuery.data) router.replace(ROUTES.admin.login);
  }, [router, sessionQuery.data, sessionQuery.isLoading, sessionQuery.isFetching]);

  const propAssetsQuery = useQuery({
    queryKey: ["prop-assets"],
    queryFn: listPropAssets,
    staleTime: 5 * 60 * 1000,
  });

  const handleAddZone = useCallback((input: Omit<DraftInvestigationZone, "tempId">) => {
    setInvestigationZones((prev) => [...prev, { tempId: makeTempId(), ...input }]);
  }, []);

  const handleUpdateZone = useCallback(
    (tempId: string, patch: Partial<Omit<DraftInvestigationZone, "tempId">>) => {
      setInvestigationZones((prev) =>
        prev.map((c) => (c.tempId === tempId ? { ...c, ...patch } : c)),
      );
    },
    [],
  );

  const handleRemoveZone = useCallback((tempId: string) => {
    setInvestigationZones((prev) => prev.filter((c) => c.tempId !== tempId));
    setClues((prev) => prev.filter((c) => c.assignmentTempId !== tempId));
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

  const hasMeaningfulZoneInput = investigationZones.some((c) => c.zoneName.trim().length > 0);
  const hasExistingDraft =
    title.trim().length > 0 ||
    description.trim().length > 0 ||
    suspects.some((s) => s.name.trim().length > 0) ||
    hasMeaningfulZoneInput ||
    clues.length > 0;

  const handleOpenAiModal = useCallback(() => {
    if (
      hasExistingDraft &&
      !window.confirm(
        "AI 가 생성한 결과로 현재 입력(제목/설명/용의자/조사 구역/단서 등)이 대체됩니다. 계속할까요?",
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
      suspects: SuspectEntry[];
      difficulty: Difficulty;
      investigationZones: DraftInvestigationZone[];
      clues: DraftClue[];
    }) => {
      setErrorMessage(null);
      setTitle(result.title);
      setDescription(result.description);
      setSuspects(
        result.suspects.length > 0
          ? result.suspects.map((s) => ({
              id: s.id?.trim() || makeTempId(),
              name: s.name,
              detail: s.detail,
            }))
          : [{ id: makeTempId(), name: "", detail: "" }],
      );
      setAnswerSuspectId("");
      setDifficulty(result.difficulty);
      setInvestigationZones(result.investigationZones);
      setClues(result.clues);
      setStep(0);
    },
    [],
  );

  const buildPayload = useCallback(() => {
    const locationsInput: CaseLocationInput[] = investigationZones.map((c) => ({
      name: locationNameFor(c),
    }));
    const zonesByTempId = new Map(investigationZones.map((c) => [c.tempId, c]));
    const toClueInput = (cl: DraftClue): CaseClueInput => {
      const owner = zonesByTempId.get(cl.assignmentTempId);
      return {
        name: cl.name,
        content: cl.content,
        location_name: owner ? locationNameFor(owner) : undefined,
        props: {
          x: Math.round(cl.x),
          y: Math.round(cl.y),
          asset: cl.asset,
          w: Math.round(cl.w),
          h: Math.round(cl.h),
        },
      };
    };
    return {
      title,
      description,
      suspect_roster: suspects
        .filter((s) => s.name.trim().length > 0)
        .map((s) => ({
          id: s.id,
          name: s.name.trim(),
          detail: s.detail.trim(),
        })),
      answer_suspect_id: answerSuspectId,
      difficulty,
      locations: locationsInput,
      clues: clues.map(toClueInput),
    };
  }, [title, description, suspects, answerSuspectId, difficulty, investigationZones, clues]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("제목을 입력해주세요.");
      if (!description.trim()) throw new Error("사건 개요(설명)를 입력해주세요.");
      if (investigationZones.length === 0) throw new Error("조사 구역을 한 곳 이상 추가해주세요.");
      if (investigationZones.some((c) => !c.zoneName.trim())) {
        throw new Error("모든 구역에 장소명을 입력해주세요.");
      }
      const normalizedZones = investigationZones.map((c) => c.zoneName.trim().toLocaleLowerCase());
      if (new Set(normalizedZones).size !== normalizedZones.length) {
        throw new Error("조사 구역 이름이 겹칩니다.");
      }
      if (clues.length > 0 && clues.some((c) => !c.name.trim())) {
        throw new Error("맵에 올린 모든 단서에 이름을 입력해주세요.");
      }
      if (clues.length === 0) {
        throw new Error("맵 에디터에 단서(소품)를 하나 이상 두어주세요.");
      }
      const namedSuspects = suspects.filter((s) => s.name.trim().length > 0);
      if (namedSuspects.length === 0) {
        throw new Error("용의자를 한 명 이상 등록하세요. (2단계)");
      }
      if (!answerSuspectId || !namedSuspects.some((s) => s.id === answerSuspectId)) {
        throw new Error("범인(정답)에 해당하는 용의자를 한 명 선택하세요. (2단계)");
      }

      const payload = buildPayload();
      if (props.mode === "edit") {
        await updateCase(props.caseId, payload);
      } else {
        await createCase({
          ...payload,
          creator_id: sessionQuery.data?.user.id ?? null,
        });
      }
    },
    onMutate: () => setErrorMessage(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-cases"] });
      router.push(ROUTES.admin.cases);
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const isBasicInfoValid = useMemo(
    () => title.trim().length > 0 && description.trim().length > 0,
    [title, description],
  );

  const isSuspectsValid = useMemo(() => {
    const named = suspects.filter((s) => s.name.trim().length > 0);
    return (
      named.length > 0 &&
      answerSuspectId.length > 0 &&
      named.some((s) => s.id === answerSuspectId)
    );
  }, [suspects, answerSuspectId]);

  const hasValidZones = useMemo(() => {
    const completeCount = investigationZones.filter((c) => c.zoneName.trim()).length;
    const normalized = investigationZones
      .map((c) => c.zoneName.trim().toLocaleLowerCase())
      .filter((z) => z.length > 0);
    return completeCount > 0 && new Set(normalized).size === normalized.length;
  }, [investigationZones]);

  const isMapEditorValid = useMemo(() => {
    if (clues.length === 0) return false;
    return clues.every((c) => c.name.trim().length > 0);
  }, [clues]);

  /** `saveMutation`과 동일한 검증 — 저장 버튼 비활성·요건 문구에 사용 */
  const saveBlockers = useMemo(() => {
    const lines: string[] = [];
    if (!title.trim()) lines.push("제목을 입력하세요. (1단계: 기본 정보)");
    if (!description.trim()) lines.push("사건 개요(설명)을 입력하세요. (1단계: 기본 정보)");
    if (investigationZones.length === 0) {
      lines.push("조사 구역을 한 곳 이상 추가하세요. (3단계: 조사 구역)");
    } else {
      if (investigationZones.some((c) => !c.zoneName.trim())) {
        lines.push("모든 조사 구역에 장소명을 입력하세요. (3단계: 조사 구역)");
      } else {
        const normalized = investigationZones.map((c) => c.zoneName.trim().toLocaleLowerCase());
        if (new Set(normalized).size !== normalized.length) {
          lines.push("조사 구역 이름이 서로 겹치지 않게 하세요. (3단계: 조사 구역)");
        }
      }
    }
    const namedSuspects = suspects.filter((s) => s.name.trim().length > 0);
    if (namedSuspects.length === 0) {
      lines.push("이름이 있는 용의자를 한 명 이상 등록하세요. (2단계: 용의자 프로필)");
    } else if (!answerSuspectId || !namedSuspects.some((s) => s.id === answerSuspectId)) {
      lines.push("범인(정답)에 해당하는 용의자를 한 명 선택하세요. (2단계: 용의자 프로필)");
    }
    if (clues.length === 0) {
      lines.push("맵에 단서(소품)를 하나 이상 올리세요. (4단계: 맵 에디터)");
    } else if (clues.some((c) => !c.name.trim())) {
      lines.push("맵에 올린 모든 단서에 이름을 붙이세요. (4단계: 맵 에디터)");
    }
    return lines;
  }, [title, description, investigationZones, suspects, answerSuspectId, clues]);

  const canSave = saveBlockers.length === 0;

  const maxReachableStep = useMemo<StepIndex>(() => {
    if (!isBasicInfoValid) return 0;
    if (!isSuspectsValid) return 1;
    if (!hasValidZones) return 2;
    if (!isMapEditorValid) return 3;
    return 3;
  }, [isBasicInfoValid, isSuspectsValid, hasValidZones, isMapEditorValid]);

  const canGoNext = useMemo(() => {
    if (step === 0) return isBasicInfoValid;
    if (step === 1) return isSuspectsValid;
    if (step === 2) return hasValidZones;
    if (step === 3) return isMapEditorValid;
    return false;
  }, [step, isBasicInfoValid, isSuspectsValid, hasValidZones, isMapEditorValid]);

  const goNext = () => {
    if (!canGoNext) return;
    setErrorMessage(null);
    if (step === 2) {
      setInvestigationZones((prev) => prev.filter((c) => c.zoneName.trim()));
    }
    setStep((s) => (Math.min(3, s + 1) as StepIndex));
  };

  const goPrev = () => {
    setErrorMessage(null);
    setStep((s) => (Math.max(0, s - 1) as StepIndex));
  };

  const pageTitle = props.pageTitle ?? (props.mode === "edit" ? "사건 수정" : "사건 만들기");

  if (!sessionQuery.data) {
    return (
      <div className="app-page flex min-h-dvh flex-col">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8" />
      </div>
    );
  }

  return (
    <div className="app-page flex min-h-dvh flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-5 px-4 py-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{pageTitle}</h1>
            <Stepper
              current={step}
              maxReachableStep={maxReachableStep}
              onSelect={(idx) => {
                if (idx > maxReachableStep) return;
                setErrorMessage(null);
                setStep(idx);
              }}
            />
          </div>
          <Button type="button" variant="default" onClick={handleOpenAiModal} disabled={saveMutation.isPending}>
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
          <SuspectsStep
            suspects={suspects}
            answerSuspectId={answerSuspectId}
            newSuspectId={makeTempId}
            onChangeSuspects={setSuspects}
            onChangeAnswerSuspectId={setAnswerSuspectId}
          />
        ) : null}

        {step === 2 ? (
          <InvestigationZonesStep
            zones={investigationZones}
            onAdd={handleAddZone}
            onUpdate={handleUpdateZone}
            onRemove={handleRemoveZone}
          />
        ) : null}

        {step === 3 ? (
          <MapEditorStep
            investigationZones={investigationZones}
            clues={clues}
            propAssets={propAssetsQuery.data ?? []}
            isLoadingAssets={propAssetsQuery.isLoading}
            onAddClue={handleAddClue}
            onUpdateClue={handleUpdateClue}
            onRemoveClue={handleRemoveClue}
          />
        ) : null}

        {errorMessage ? (
          <p className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {errorMessage}
          </p>
        ) : null}

        <footer className="flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={goPrev} disabled={step === 0 || saveMutation.isPending}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            이전
          </Button>

          {step < 3 ? (
            <Button type="button" onClick={goNext} disabled={!canGoNext} variant="default">
              다음
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={!canSave || saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              저장
            </Button>
          )}
        </footer>
      </main>

      <AIGenerateModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        propAssets={(propAssetsQuery.data ?? []).map((a) => a.asset)}
        propCatalog={(propAssetsQuery.data ?? []).map((a) => ({
          asset: a.asset,
          ...mapPixelSizeFromAssetTiles(a.tileW, a.tileH),
        }))}
        initialDifficulty={difficulty}
        onApply={handleApplyAiResult}
      />
    </div>
  );
}

function Stepper({
  current,
  maxReachableStep,
  onSelect,
}: {
  current: StepIndex;
  maxReachableStep: StepIndex;
  onSelect: (idx: StepIndex) => void;
}) {
  return (
    <ol
      role="tablist"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[var(--muted-foreground)]"
    >
      {STEP_LABELS.map((label, idx) => {
        const active = idx === current;
        const done = idx < current;
        const disabled = idx > maxReachableStep;
        return (
          <li key={label} className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              role="tab"
              disabled={disabled}
              onClick={() => onSelect(idx as StepIndex)}
              className={
                "group flex items-center gap-2 rounded-md px-1.5 py-1" +
                (disabled ? " opacity-45" : " cursor-pointer hover:bg-[var(--tint-accent)]")
              }
            >
              <span
                className={
                  "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums " +
                  (active
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)] shadow-sm"
                    : done
                      ? "border-[var(--accent)] bg-[var(--tint-accent-medium)] text-[var(--mystery)]"
                      : "border-[var(--accent)]/45 bg-[var(--surface)] text-[var(--muted-foreground)]")
                }
              >
                {idx + 1}
              </span>
              <span
                className={
                  active
                    ? "font-semibold text-[var(--foreground)]"
                    : done
                      ? "text-[var(--accent)]"
                      : "text-[var(--muted-foreground)]"
                }
              >
                {label}
              </span>
            </Button>
            {idx < STEP_LABELS.length - 1 ? (
              <span className="mx-1 h-px w-6 bg-[var(--accent)]/35" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
