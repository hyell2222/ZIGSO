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
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (pack: ActivityPack) => void;
};

const GROUP_SIZE_MIN = 2;
const GROUP_SIZE_MAX = 12;

export function AIActivityGenerateModal({ open, onClose, onApply }: Props) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<AiDifficultyLevel>("Normal");
  const [roleCount, setRoleCount] = useState(3);
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
        taskCount: roleCount,
        contentLanguage,
      });
      onApply(pack);
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
      onClose={onClose}
      title="AI로 활동 초안 만들기"
      titleId="ai-activity-generate-modal-title"
      closeOnBackdrop={!loading}
    >
      <div className="space-y-4">
        <FormField
          label="수업 주제"
          help="단원·차시 주제를 적으면 역할·단서·공유 학습지에 반영됩니다."
          htmlFor="ai-activity-topic"
        >
          <Textarea
            id="ai-activity-topic"
            placeholder="예: 중2 과학 ‘식물의 구조’, 고1 영어 ‘환경 보호’"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
          />
        </FormField>

        <FormField label="난이도" help="저장되지 않습니다. 단서·공유 학습지 난이도 조절에만 사용합니다.">
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

        <FormField label="콘텐츠 언어">
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
          <FormField label="역할 수" help="모둠 인원과 같습니다. 역할당 단어 1개">
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
          <FormField
            label="학습지 빈칸 수"
            help="최종 요약문에 넣을 빈칸(역할별 단어) 수 — 보통 역할 수와 같습니다"
          >
            <p className="text-sm text-[var(--muted-foreground)]">
              역할 수({roleCount})와 같게 생성됩니다 — 역할마다 학습지 빈칸 1개
            </p>
          </FormField>
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
              활동 초안 생성
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
}
