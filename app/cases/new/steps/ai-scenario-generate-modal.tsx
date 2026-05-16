"use client";

import { Loader2, Minus, Plus, Sparkles } from "lucide-react";
import { useState } from "react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateScenarioPackWithAI } from "@/lib/api/ai-scenario";
import { DIFFICULTY_UI_OPTIONS, type DifficultyLevel } from "@/lib/api/lessons";
import type { ScenarioPack } from "@/lib/lunch/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  initialDifficulty?: DifficultyLevel;
  onApply: (pack: ScenarioPack) => void;
};

const TEAM_SIZE_MIN = 2;
const TEAM_SIZE_MAX = 12;
const MENU_COUNT_MIN = 1;
const MENU_COUNT_MAX = 6;

const ENGLISH_LEVELS = ["A1", "A2", "B1", "B2"] as const;

export function AIScenarioGenerateModal({ open, onClose, initialDifficulty, onApply }: Props) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialDifficulty ?? "Normal");
  const [teamSize, setTeamSize] = useState(4);
  const [menuCount, setMenuCount] = useState(6);
  const [englishLevel, setEnglishLevel] = useState<(typeof ENGLISH_LEVELS)[number]>("A2");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      const pack = await generateScenarioPackWithAI({
        topic: topic.trim() || undefined,
        difficulty,
        teamSize,
        menuCount,
        englishLevel,
      });
      onApply(pack);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI 급식 시나리오 생성"
      titleId="ai-scenario-generate-modal-title"
      maxWidthClassName="max-w-lg"
      closeOnBackdrop={!loading}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">수업 주제</label>
          <Textarea
            className="mt-1"
            placeholder="예: food vocabulary, school lunch culture"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <p className="text-sm font-medium">난이도</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DIFFICULTY_UI_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDifficulty(opt.value)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm",
                  difficulty === opt.value
                    ? "border-[var(--accent)] bg-[var(--tint-accent-strong)]"
                    : "border-[var(--border)]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium">영어 수준</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ENGLISH_LEVELS.map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => setEnglishLevel(lv)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm",
                  englishLevel === lv
                    ? "border-[var(--accent)] bg-[var(--tint-accent-strong)]"
                    : "border-[var(--border)]",
                )}
              >
                {lv}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium">팀 인원</p>
            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={teamSize <= TEAM_SIZE_MIN}
                onClick={() => setTeamSize((n) => Math.max(TEAM_SIZE_MIN, n - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-mono">{teamSize}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={teamSize >= TEAM_SIZE_MAX}
                onClick={() => setTeamSize((n) => Math.min(TEAM_SIZE_MAX, n + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">메뉴 수</p>
            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={menuCount <= MENU_COUNT_MIN}
                onClick={() => setMenuCount((n) => Math.max(MENU_COUNT_MIN, n - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-mono">{menuCount}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={menuCount >= MENU_COUNT_MAX}
                onClick={() => setMenuCount((n) => Math.min(MENU_COUNT_MAX, n + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

        <Button type="button" className="w-full" disabled={loading} onClick={handleGenerate}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              생성 중…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              급식 시나리오 생성
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
}
