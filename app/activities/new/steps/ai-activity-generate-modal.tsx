"use client";

import { Loader2, Minus, Plus, Sparkles } from "lucide-react";
import { useState } from "react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateActivityPackWithAI } from "@/lib/api/ai-activity";
import { DIFFICULTY_UI_OPTIONS, type DifficultyLevel } from "@/lib/api/activities";
import {
  CONTENT_LANGUAGE_OPTIONS,
  DEFAULT_CONTENT_LANGUAGE,
  type ContentLanguage,
} from "@/lib/activity-pack/content-language";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  initialDifficulty?: DifficultyLevel;
  onApply: (pack: ActivityPack) => void;
};

const GROUP_SIZE_MIN = 2;
const GROUP_SIZE_MAX = 12;
const TASK_COUNT_MIN = 1;
const TASK_COUNT_MAX = 6;

export function AIActivityGenerateModal({ open, onClose, initialDifficulty, onApply }: Props) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialDifficulty ?? "Normal");
  const [groupSize, setGroupSize] = useState(4);
  const [taskCount, setTaskCount] = useState(6);
  const [contentLanguage, setContentLanguage] = useState<ContentLanguage>(DEFAULT_CONTENT_LANGUAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      const pack = await generateActivityPackWithAI({
        topic: topic.trim() || undefined,
        difficulty,
        groupSize,
        taskCount,
        contentLanguage,
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
      title="AI 활동 팩 생성"
      titleId="ai-activity-generate-modal-title"
      maxWidthClassName="max-w-lg"
      closeOnBackdrop={!loading}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">활동 주제</label>
          <Textarea
            className="mt-1"
            placeholder="예: 환경 보호, 협동 독서, 음식 문화"
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
          <p className="text-sm font-medium">안내 언어 (제목·설명·힌트·수행 문장)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CONTENT_LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setContentLanguage(opt.value)}
                className={cn(
                  "min-w-[8.5rem] flex-1 rounded-md border px-3 py-2 text-left text-sm",
                  contentLanguage === opt.value
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
            <p className="text-sm font-medium">모둠 인원</p>
            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={groupSize <= GROUP_SIZE_MIN}
                onClick={() => setGroupSize((n) => Math.max(GROUP_SIZE_MIN, n - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-mono">{groupSize}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={groupSize >= GROUP_SIZE_MAX}
                onClick={() => setGroupSize((n) => Math.min(GROUP_SIZE_MAX, n + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">과제 수</p>
            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={taskCount <= TASK_COUNT_MIN}
                onClick={() => setTaskCount((n) => Math.max(TASK_COUNT_MIN, n - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-mono">{taskCount}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={taskCount >= TASK_COUNT_MAX}
                onClick={() => setTaskCount((n) => Math.min(TASK_COUNT_MAX, n + 1))}
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
              활동 팩 생성
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
}
