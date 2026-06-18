"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { generateLearningContentWithAI } from "@/lib/api/ai-activity";
import {
  CONTENT_DIFFICULTY_OPTIONS,
  DEFAULT_CONTENT_DIFFICULTY,
  type ContentDifficulty,
} from "@/lib/activity-pack/content-difficulty";
import {
  CONTENT_LANGUAGE_OPTIONS,
  DEFAULT_CONTENT_LANGUAGE,
  type ContentLanguage,
} from "@/lib/activity-pack/content-language";
import { cn } from "@/lib/utils";

const modalTitleId = "learning-content-ai-modal-title";

type Props = {
  open: boolean;
  onClose: () => void;
  activityTitle: string;
  onGenerated: (segment: string) => void;
};

function OptionButtonGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <FormField label={label}>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                selected
                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]"
                  : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </FormField>
  );
}

export function LearningContentAIModal({ open, onClose, activityTitle, onGenerated }: Props) {
  const [topic, setTopic] = useState("");
  const [contentLanguage, setContentLanguage] = useState<ContentLanguage>(DEFAULT_CONTENT_LANGUAGE);
  const [difficulty, setDifficulty] = useState<ContentDifficulty>(DEFAULT_CONTENT_DIFFICULTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (loading) return;
    setError(null);
    onClose();
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("학습 주제를 입력하세요.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { segment } = await generateLearningContentWithAI({
        topic: topic.trim(),
        activityTitle: activityTitle.trim() || undefined,
        contentLanguage,
        difficulty,
      });
      onGenerated(segment);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="AI 학습 내용 생성"
      titleId={modalTitleId}
      contentClassName="space-y-4 px-5 py-4"
      footer={
        <>
          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={handleClose}>
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={loading}
            className="gap-1"
            onClick={() => void handleGenerate()}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
            )}
            생성
          </Button>
        </>
      }
    >
      <FormField label="학습 주제" htmlFor="learning-content-topic" required>
        <Input
          id="learning-content-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="예: 기후 변화와 재생 에너지"
          className="h-9 w-full text-sm"
          disabled={loading}
        />
      </FormField>

      <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          생성 옵션
        </p>
        <OptionButtonGroup
          label="언어"
          options={CONTENT_LANGUAGE_OPTIONS}
          value={contentLanguage}
          onChange={setContentLanguage}
        />

        <OptionButtonGroup
          label="난이도"
          options={CONTENT_DIFFICULTY_OPTIONS}
          value={difficulty}
          onChange={setDifficulty}
        />
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
    </Modal>
  );
}
