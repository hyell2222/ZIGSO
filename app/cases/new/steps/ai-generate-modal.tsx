"use client";

import { Loader2, Minus, Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateCaseWithAI, type PropCatalogEntry } from "@/lib/api/ai-case";
import { DIFFICULTY_UI_OPTIONS, normalizeDifficultyValue } from "@/lib/api/cases";
import { makeTempId } from "@/lib/temp-id";
import type { SuspectEntry } from "@/lib/suspects";
import { cn } from "@/lib/utils";

import type { Difficulty } from "./basic-info-step";
import type { DraftInvestigationZone, DraftClue } from "./types";

export type AIGenerateResult = {
  title: string;
  description: string;
  suspects: SuspectEntry[];
  difficulty: Difficulty;
  investigationZones: DraftInvestigationZone[];
  clues: DraftClue[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** 모델에 전달할 사용 가능한 소품식별자 목록 */
  propAssets: string[];
  /** 에셋별 맵상 크기(px) — 있으면 AI 배치·후처리가 이 w/h 를 따름 */
  propCatalog?: PropCatalogEntry[];
  /** 현재 화면에 설정된 난이도 (AI 초기값) */
  initialDifficulty: Difficulty;
  /** 생성 결과를 편집 중인 사건 데이터에 반영 */
  onApply: (result: AIGenerateResult) => void;
};

const TEAM_SIZE_MIN = 2;
const TEAM_SIZE_MAX = 12;
const CLUES_PER_ZONE_MIN = 2;
const CLUES_PER_ZONE_MAX = 10;

const chipButtonClass = (active: boolean) =>
  cn(
    "rounded-md border px-3 py-1.5 text-sm transition-colors",
    active
      ? "border-[var(--accent)] bg-[var(--tint-accent-strong)] text-[var(--accent)]"
      : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--tint-mystery)]",
  );

const aiModalCheckboxClass =
  "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border border-[var(--border)] bg-[var(--background)] shadow-[inset_var(--input-inset)] accent-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_50%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tint-mystery)] disabled:cursor-not-allowed disabled:opacity-50";

function QuantityStepper({
  value,
  min,
  max,
  disabled,
  formatValue,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  formatValue: (n: number) => string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="한 단계 감소"
      >
        <Minus className="h-4 w-4" aria-hidden />
      </Button>
      <span className="min-w-[4.5rem] text-center text-sm font-semibold tabular-nums text-[var(--foreground)]">
        {formatValue(value)}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="한 단계 증가"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}

export function AIGenerateModal({
  open,
  onClose,
  propAssets,
  propCatalog,
  initialDifficulty,
  onApply,
}: Props) {
  const [theme, setTheme] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [cluesPerZone, setCluesPerZone] = useState(4);
  const [teamSize, setTeamSize] = useState(4);
  const [learningObjective, setLearningObjective] = useState("");
  const [caseInEnglish, setCaseInEnglish] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setIsLoading(false);
      setTeamSize(4);
      setCluesPerZone(4);
      setLearningObjective("");
      setCaseInEnglish(false);
    } else {
      setDifficulty(initialDifficulty);
    }
  }, [open, initialDifficulty]);

  if (!open) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await generateCaseWithAI({
        prompt: theme,
        propAssets,
        propCatalog,
        difficulty,
        cluesPerZone,
        teamSize,
        learningObjective: learningObjective.trim() || undefined,
        caseInEnglish,
      });

      const investigationZones: DraftInvestigationZone[] = data.investigation_zones.map((c) => ({
        tempId: makeTempId(),
        zoneName: c.zone_name,
      }));

      const clues: DraftClue[] = data.clues
        .map((c) => {
          const owner = investigationZones[c.assignment_index];
          if (!owner) return null;
          return {
            tempId: makeTempId(),
            assignmentTempId: owner.tempId,
            asset: c.asset,
            x: c.x,
            y: c.y,
            w: c.w,
            h: c.h,
            name: c.name,
            content: c.content,
          } satisfies DraftClue;
        })
        .filter((v): v is DraftClue => v !== null);

      onApply({
        title: data.title,
        description: data.description,
        suspects: data.suspect_roster.map((s) => ({
          id: s.id?.trim() || makeTempId(),
          name: typeof s.name === "string" ? s.name : "",
          detail: typeof s.detail === "string" ? s.detail : "",
        })),
        difficulty: normalizeDifficultyValue(data.difficulty),
        investigationZones,
        clues,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const propMissing = propAssets.length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI로 사건 생성"
      titleId="ai-generate-modal-title"
      maxWidthClassName="max-w-lg"
      titlePrefix={<Sparkles className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />}
      closeOnBackdrop={!isLoading}
      bodyClassName="space-y-4"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            취소
          </Button>
          <Button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isLoading || propMissing}
          >
            {isLoading ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin text-[var(--primary)]" aria-hidden />
            ) : (
              <Sparkles className="mr-1 h-4 w-4" aria-hidden />
            )}
            {isLoading ? "생성 중…" : "생성하기"}
          </Button>
        </>
      }
    >
      {propMissing ? (
        <p className="rounded-md border border-[var(--panel-warn-border)] bg-[var(--panel-warn-bg)] px-3 py-2 text-sm text-[var(--foreground)]">
          맵에 배치할 수 있는 소품이 없어 AI 생성을 실행할 수 없습니다. 이전 단계에서 에셋을
          추가해 주세요.
        </p>
      ) : null}

      <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
        AI가 생성한 결과는 기본 정보·용의자·조사 장소·맵 단계에 한 번에 반영됩니다.
        범인 지정은 용의자 단계에서 직접 해야 합니다.
      </p>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--accent)]" htmlFor="ai-theme-keyword">
          주제 및 키워드
        </label>
        <Textarea
          id="ai-theme-keyword"
          value={theme}
          onChange={(event) => setTheme(event.target.value)}
          placeholder="예) 졸업식 전날 사라진 졸업장"
          rows={4}
          disabled={isLoading}
          className="min-h-[5.5rem] resize-y"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="ai-learning-objective" className="text-xs font-medium text-[var(--accent)]">
          학습 목표
        </label>
        <Textarea
          id="ai-learning-objective"
          value={learningObjective}
          onChange={(event) => setLearningObjective(event.target.value)}
          placeholder="예) 가설 수립과 근거 제시"
          rows={3}
          disabled={isLoading}
          className="min-h-[4.5rem] resize-y"
        />
      </div>

      <div
        className={cn(
          "space-y-4 rounded-xl border border-[var(--border)] bg-[var(--tint-mystery)]/80 px-3 py-4 sm:px-4",
          "shadow-[inset_var(--input-inset)]",
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          생성 옵션
        </p>

        <fieldset className="min-w-0 border-0 p-0">
          <legend className="w-full pb-2 text-left text-xs font-medium text-[var(--accent)]">난이도</legend>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTY_UI_OPTIONS.map(({ value: d, label }) => (
              <Button
                key={d}
                type="button"
                variant="tab"
                disabled={isLoading}
                aria-pressed={difficulty === d}
                onClick={() => setDifficulty(d)}
                className={chipButtonClass(difficulty === d)}
              >
                {label}
              </Button>
            ))}
          </div>
        </fieldset>

        <fieldset className="min-w-0 border-0 p-0">
          <legend className="w-full pb-2 text-left text-xs font-medium text-[var(--accent)]">팀당 인원</legend>
          <QuantityStepper
            value={teamSize}
            min={TEAM_SIZE_MIN}
            max={TEAM_SIZE_MAX}
            disabled={isLoading}
            formatValue={(n) => `${n}명`}
            onChange={setTeamSize}
          />
        </fieldset>

        <fieldset className="min-w-0 border-0 p-0">
          <legend className="w-full pb-2 text-left text-xs font-medium text-[var(--accent)]">
            장소당 단서 개수
          </legend>
          <QuantityStepper
            value={cluesPerZone}
            min={CLUES_PER_ZONE_MIN}
            max={CLUES_PER_ZONE_MAX}
            disabled={isLoading}
            formatValue={(n) => `${n}개`}
            onChange={setCluesPerZone}
          />
        </fieldset>

        <fieldset className="min-w-0 border-0 p-0">
          <legend className="w-full pb-2 text-left text-xs font-medium text-[var(--accent)]">
            영어 사건 생성
          </legend>
          <div className="flex items-start gap-3 rounded-lg border border-[color-mix(in_srgb,var(--border)_75%,transparent)] bg-[var(--background)]/50 px-3 py-2.5">
            <input
              id="ai-case-english"
              type="checkbox"
              checked={caseInEnglish}
              onChange={(event) => setCaseInEnglish(event.target.checked)}
              disabled={isLoading}
              className={aiModalCheckboxClass}
            />
            <label htmlFor="ai-case-english" className="cursor-pointer text-left text-sm leading-snug text-[var(--foreground)]">
              <span className="font-medium">영어로 사건 생성하기</span>
            </label>
          </div>
        </fieldset>
      </div>

      {error ? (
        <p className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
