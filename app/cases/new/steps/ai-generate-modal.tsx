"use client";

import { Loader2, Minus, Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateCaseWithAI, type PropCatalogEntry } from "@/lib/api/ai-case";
import { makeTempId } from "@/lib/temp-id";
import type { SuspectEntry } from "@/lib/suspects";

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
  /** DB `asset_metadata` 기준 맵상 크기 — 있으면 AI 배치가 이 크기를 따름 */
  propCatalog?: PropCatalogEntry[];
  /** 현재 화면에 설정된 난이도 (AI 초기값) */
  initialDifficulty: Difficulty;
  /** 생성 결과를 편집 중인 사건 데이터에 반영 */
  onApply: (result: AIGenerateResult) => void;
};

const TEAM_SIZE_MIN = 2;
const TEAM_SIZE_MAX = 12;

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
  const [cluesPerZone, setCluesPerZone] = useState<number>(4);
  const [teamSize, setTeamSize] = useState(4);
  const [learningObjective, setLearningObjective] = useState("");
  const [cluesInEnglish, setCluesInEnglish] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setIsLoading(false);
      setTeamSize(4);
      setLearningObjective("");
      setCluesInEnglish(false);
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
        cluesInEnglish,
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
        difficulty: data.difficulty,
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI로 사건 생성"
      titleId="ai-generate-modal-title"
      maxWidthClassName="max-w-xl"
      titlePrefix={<Sparkles className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />}
      closeOnBackdrop={!isLoading}
      bodyClassName="space-y-4"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            취소
          </Button>
          <Button type="button" onClick={() => void handleGenerate()} disabled={isLoading || propAssets.length === 0}>
            {isLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="mr-1 h-4 w-4" aria-hidden />}
            {isLoading ? "생성 중…" : "생성하기"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--accent)]">
              주제 / 키워드 (선택)
            </label>
            <Textarea
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
              placeholder="예) 졸업식 전날 사라진 졸업장. 학교를 배경으로 4명의 캐릭터가 등장하는 미스터리"
              rows={4}
              disabled={isLoading}
            />
            <p className="text-[11px] text-[var(--muted-foreground,#94a3b8)]">
              비워 두면 학교·동아리 미스터리를 AI 가 제안합니다. 생성 결과는 1~4단계(기본 정보·용의자·장소·맵)에 한꺼번에 채워집니다. 범인 지정은 2단계에서 직접 해 주세요.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--accent)]">팀당 인원</label>
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={isLoading || teamSize <= TEAM_SIZE_MIN}
                onClick={() => setTeamSize((n) => Math.max(TEAM_SIZE_MIN, n - 1))}
                aria-label="인원 한 명 줄이기"
              >
                <Minus className="h-4 w-4" aria-hidden />
              </Button>
              <span className="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums text-[var(--foreground)]">
                {teamSize}명
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={isLoading || teamSize >= TEAM_SIZE_MAX}
                onClick={() => setTeamSize((n) => Math.min(TEAM_SIZE_MAX, n + 1))}
                aria-label="인원 한 명 늘리기"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground,#94a3b8)]">
              한 팀 협동 인원을 정하면 단서 분산·장소 수·난이도 힌트에 반영됩니다.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="ai-learning-objective" className="text-xs font-medium text-[var(--accent)]">
              학습 목표 (선택)
            </label>
            <Textarea
              id="ai-learning-objective"
              value={learningObjective}
              onChange={(event) => setLearningObjective(event.target.value)}
              placeholder="예) 가설 수립과 근거 제시를 연습한다, 팀 내 역할 분담을 경험한다…"
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-start gap-2.5 rounded-md border border-[var(--border)] bg-[var(--tint-mystery)] px-3 py-2.5">
            <input
              id="ai-clues-english"
              type="checkbox"
              checked={cluesInEnglish}
              onChange={(event) => setCluesInEnglish(event.target.checked)}
              disabled={isLoading}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border)] text-[var(--primary)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 focus:ring-offset-[var(--card-bg)]"
            />
            <label htmlFor="ai-clues-english" className="cursor-pointer text-left text-sm leading-snug">
              <span className="font-medium text-[var(--foreground)]">단서를 영어로 생성</span>
              <span className="mt-0.5 block text-[11px] text-[var(--muted-foreground,#94a3b8)]">
                맵 단서 이름·본문만 영어. 제목·사건 파악·장소명·용의자는 한국어로 유지합니다.
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--accent)]">난이도</label>
              <div className="flex flex-wrap gap-1.5">
                {(["Easy", "Normal", "Hard"] as const).map((d) => {
                  const active = difficulty === d;
                  return (
                    <Button
                      key={d}
                      type="button"
                      variant="tab"
                      onClick={() => setDifficulty(d)}
                      disabled={isLoading}
                      className={
                        "rounded-md border px-2.5 py-1 text-xs " +
                        (active
                          ? "border-[var(--accent)] bg-[var(--tint-accent-strong)] text-[var(--accent)]"
                          : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--tint-mystery)]")
                      }
                    >
                      {d}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--accent)]">
                장소당 단서 개수
              </label>
              <input
                type="number"
                min={2}
                max={10}
                step={1}
                value={cluesPerZone}
                onChange={(event) => {
                  const n = Number(event.target.value);
                  if (!Number.isFinite(n)) {
                    setCluesPerZone(4);
                    return;
                  }
                  setCluesPerZone(Math.min(10, Math.max(2, Math.floor(n))));
                }}
                disabled={isLoading}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--input,transparent)] px-2 py-1 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
              />
              <p className="text-[11px] text-[var(--muted-foreground,#94a3b8)]">
                조사 장소 하나마다 배치할 단서 수의 기대치입니다(2~10).
              </p>
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
              {error}
            </p>
          ) : null}
      </div>
    </Modal>
  );
}
