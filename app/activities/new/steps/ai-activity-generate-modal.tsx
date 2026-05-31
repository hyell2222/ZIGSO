"use client";

import { Loader2, Minus, Plus, Sparkles } from "lucide-react";
import { useState } from "react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { generateActivityPackWithAI } from "@/lib/api/ai-activity";
import {
  AI_DIFFICULTY_UI_OPTIONS,
  type AiDifficultyLevel,
} from "@/lib/activity-pack/ai-difficulty";
import {
  CONTENT_LANGUAGE_OPTIONS,
  DEFAULT_CONTENT_LANGUAGE,
  type ContentLanguage,
} from "@/lib/activity-pack/content-language";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { TEACHER_AI_COPY } from "@/lib/copy/teacher";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (pack: ActivityPack) => void;
};

const GROUP_SIZE_MIN = 2;
const GROUP_SIZE_MAX = 12;
const TASK_COUNT_MIN = 1;
const TASK_COUNT_MAX = 6;

export function AIActivityGenerateModal({ open, onClose, onApply }: Props) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<AiDifficultyLevel>("Normal");
  const [roleCount, setRoleCount] = useState(3);
  const [taskCount, setTaskCount] = useState(3);
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
        roleCount,
        taskCount,
        contentLanguage,
      });
      onApply(pack);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : TEACHER_AI_COPY.generateFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={TEACHER_AI_COPY.modalTitle}
      titleId="ai-activity-generate-modal-title"
      closeOnBackdrop={!loading}
    >
      <div className="space-y-4">
        <FormField
          label={TEACHER_AI_COPY.topicLabel}
          help={TEACHER_AI_COPY.topicHelp}
          htmlFor="ai-activity-topic"
        >
          <Textarea
            id="ai-activity-topic"
            placeholder={TEACHER_AI_COPY.topicPlaceholder}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
          />
        </FormField>

        <FormField label={TEACHER_AI_COPY.difficultyLabel} help={TEACHER_AI_COPY.difficultyHelp}>
          <div className="flex flex-wrap gap-2">
            {AI_DIFFICULTY_UI_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDifficulty(opt.value)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-medium",
                  difficulty === opt.value
                    ? "border-[var(--accent)] bg-[var(--tint-accent-strong)]"
                    : "border-[var(--border)]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label={TEACHER_AI_COPY.languageLabel}>
          <div className="flex flex-wrap gap-2">
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
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={TEACHER_AI_COPY.roleCountLabel} help={TEACHER_AI_COPY.roleCountHelp}>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={roleCount <= GROUP_SIZE_MIN}
                onClick={() => setRoleCount((n) => Math.max(GROUP_SIZE_MIN, n - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-mono">{roleCount}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={roleCount >= GROUP_SIZE_MAX}
                onClick={() => setRoleCount((n) => Math.min(GROUP_SIZE_MAX, n + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </FormField>
          <FormField label={TEACHER_AI_COPY.missionCountLabel} help={TEACHER_AI_COPY.missionCountHelp}>
            <div className="flex items-center gap-2">
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
          </FormField>
        </div>

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

        <Button type="button" className="w-full" disabled={loading} onClick={handleGenerate}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {TEACHER_AI_COPY.generating}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              {TEACHER_AI_COPY.generate}
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
}
