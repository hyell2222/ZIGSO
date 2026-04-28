"use client";

import { Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

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
  /** 모델에 전달할 사용 가능한 prop 식별자 목록 */
  propAssets: string[];
  /** DB `asset_metadata` 기준 맵상 크기 — 있으면 AI 배치가 이 크기를 따름 */
  propCatalog?: PropCatalogEntry[];
  /** 현재 wizard 의 난이도 (시작값) */
  initialDifficulty: Difficulty;
  /** AI 결과를 wizard state 로 적용 */
  onApply: (result: AIGenerateResult) => void;
};

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
  const [targetClueCount, setTargetClueCount] = useState<number>(15);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setIsLoading(false);
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
        targetClueCount,
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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isLoading) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-xl">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">AI로 사건 생성</h2>
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="icon"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="space-y-4 px-4 py-4">
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
              비워 두면 학교·동아리 미스터리를 AI 가 제안합니다. 생성 결과는 마법사 1~4단계(기본 정보·용의자·구역·맵)에 한꺼번에 채워집니다. 범인 지정은 2단계에서 직접 해 주세요.
            </p>
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
                권장 단서 개수
              </label>
              <input
                type="number"
                min={4}
                max={40}
                step={1}
                value={targetClueCount}
                onChange={(event) =>
                  setTargetClueCount(Number(event.target.value) || 0)
                }
                disabled={isLoading}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--input,transparent)] px-2 py-1 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>

          {propAssets.length === 0 ? (
            <p className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
              사용 가능한 prop asset 이 없습니다. Supabase Storage 의 props 버킷을 확인하세요.
            </p>
          ) : (
            <p className="text-[11px] text-[var(--muted-foreground,#94a3b8)]">
              Storage 에 등록된 prop {propAssets.length}개 식별자만 사용해 단서를 배치합니다(목록에 없는 이름은 서버에서 제거됩니다).
            </p>
          )}

          {error ? (
            <p className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            취소
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || propAssets.length === 0}
          >
            {isLoading ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-4 w-4" />
            )}
            {isLoading ? "생성 중..." : "생성하기"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
