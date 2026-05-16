"use client";

import { Loader2, Minus, Plus, Sparkles } from "lucide-react";
import { useState } from "react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateScenarioPackWithAI } from "@/lib/api/ai-scenario";
import { DIFFICULTY_UI_OPTIONS, type DifficultyLevel } from "@/lib/api/lessons";
import {
  BRIEFING_LANGUAGE_OPTIONS,
  DEFAULT_BRIEFING_LANGUAGE,
  ENGLISH_LEVEL_OPTIONS,
  type BriefingLanguage,
} from "@/lib/lunch/english-level";
import type { EnglishLevel, ScenarioPack } from "@/lib/lunch/types";
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

export function AIScenarioGenerateModal({ open, onClose, initialDifficulty, onApply }: Props) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialDifficulty ?? "Normal");
  const [teamSize, setTeamSize] = useState(4);
  const [menuCount, setMenuCount] = useState(6);
  const [englishLevel, setEnglishLevel] = useState<EnglishLevel>("A2");
  const [briefingLanguage, setBriefingLanguage] = useState<BriefingLanguage>(DEFAULT_BRIEFING_LANGUAGE);
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
        briefingLanguage,
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
            placeholder="예: 음식 어휘, 학교 급식 문화"
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
          <p className="text-sm font-medium">학습 영어 수준</p>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            힌트·조리 명령·정답 영어의 난이도를 맞춥니다.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {ENGLISH_LEVEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEnglishLevel(opt.value)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm transition",
                  englishLevel === opt.value
                    ? "border-[var(--accent)] bg-[var(--tint-accent-strong)]"
                    : "border-[var(--border)] hover:border-[var(--accent)]",
                )}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
                  {opt.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium">안내 언어 (제목·설명)</p>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            재료 힌트와 조리 카드는 항상 영어로 생성됩니다.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {BRIEFING_LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBriefingLanguage(opt.value)}
                className={cn(
                  "min-w-[8.5rem] flex-1 rounded-md border px-3 py-2 text-left text-sm",
                  briefingLanguage === opt.value
                    ? "border-[var(--accent)] bg-[var(--tint-accent-strong)]"
                    : "border-[var(--border)]",
                )}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
                  {opt.description}
                </span>
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
