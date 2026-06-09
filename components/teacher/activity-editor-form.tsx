"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Sparkles,
  Loader2,
  Link,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField, formLabelClass } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { generateRoleQuestionsWithAI } from "@/lib/api/ai-activity";
import {
  createEmptyQuestion,
  createEmptyRole,
  editorQuestionLabel,
  editorRoleLabel,
  questionsToEditor,
  CHOICE_LABELS,
  MAX_CHOICES_PER_QUESTION,
  MAX_ROLES_PER_GROUP,
  MIN_CHOICES_PER_QUESTION,
  MIN_QUESTIONS_PER_ROLE,
  MIN_ROLES_PER_GROUP,
  type EditorQuestion,
  type EditorRole,
  type ActivityEditorDraft,
} from "@/lib/activity-pack/activity-draft";
import { DEFAULT_CONTENT_LANGUAGE } from "@/lib/activity-pack/content-language";
import { ACTIVITY_FLOW_STEPS, EDITOR_QUESTION_HINTS } from "@/lib/activity-phases";
import { cn } from "@/lib/utils";

type Props = {
  draft: ActivityEditorDraft;
  onChange: (draft: ActivityEditorDraft) => void;
};

type QuestionKind = "practice" | "test";

const inputClass = "h-9 w-full text-sm";
const textareaClass = "resize-y text-sm";

function parseEditorHints(hints: string) {
  const lines = hints.split("\n");
  return { hint1: lines[0] ?? "", hint2: lines[1] ?? "" };
}

function serializeEditorHints(hint1: string, hint2: string) {
  return [hint1, hint2].join("\n");
}

function mergeGeneratedQuestion(current: EditorQuestion, generated: EditorQuestion): EditorQuestion {
  return {
    ...current,
    prompt: generated.prompt,
    choices: generated.choices,
    correctIndex: generated.correctIndex,
    hints: generated.hints,
    explanation: generated.explanation,
  };
}

function QuestionAIGenerateButton({
  segment,
  activityTitle,
  kind,
  existingPrompts,
  onGenerated,
}: {
  segment: string;
  activityTitle: string;
  kind: QuestionKind;
  existingPrompts: string[];
  onGenerated: (question: EditorQuestion) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!segment.trim()) {
      setError("학습 내용을 먼저 입력하세요.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { questions } = await generateRoleQuestionsWithAI({
        segment: segment.trim(),
        activityTitle: activityTitle.trim() || undefined,
        kind,
        questionCount: 1,
        contentLanguage: DEFAULT_CONTENT_LANGUAGE,
        existingQuestions: existingPrompts,
      });
      const [generated] = questionsToEditor(questions);
      if (!generated) throw new Error("생성된 문항이 없습니다.");
      onGenerated(generated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-0.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1 px-2 text-xs"
        disabled={loading}
        onClick={() => void handleGenerate()}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
        )}
        AI 생성
      </Button>
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}

function SingleQuestionEditor({
  question: q,
  withScaffold,
  onUpdate,
}: {
  question: EditorQuestion;
  withScaffold?: boolean;
  onUpdate: (updater: (q: EditorQuestion) => EditorQuestion) => void;
}) {
  const canAddChoice = q.choices.length < MAX_CHOICES_PER_QUESTION;
  const canRemoveChoice = q.choices.length > MIN_CHOICES_PER_QUESTION;
  const { hint1, hint2 } = parseEditorHints(q.hints);

  return (
    <div className="space-y-3">
      <FormField label="발문" htmlFor={`q-prompt-${q.localId}`}>
        <Textarea
          id={`q-prompt-${q.localId}`}
          rows={2}
          value={q.prompt}
          onChange={(e) => onUpdate((cur) => ({ ...cur, prompt: e.target.value }))}
          placeholder="발문을 입력하세요."
          className={cn(textareaClass, "min-h-[2.5rem]")}
        />
      </FormField>

      <div className="space-y-1.5">
        <p className={formLabelClass}>보기</p>
        {q.choices.map((choice, ci) => {
          const isCorrect = q.correctIndex === ci;
          return (
            <div key={ci} className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={isCorrect}
                aria-label={`${CHOICE_LABELS[ci] ?? ci + 1}번 정답`}
                onClick={() => onUpdate((cur) => ({ ...cur, correctIndex: ci }))}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                  isCorrect
                    ? "border-[var(--primary)] bg-[var(--tint-accent-strong)] text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)]",
                )}
              >
                {isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              </button>
              <span className="w-4 text-xs font-medium text-[var(--muted-foreground)]">
                {CHOICE_LABELS[ci] ?? ci + 1}
              </span>
              <Input
                value={choice}
                onChange={(e) =>
                  onUpdate((cur) => ({
                    ...cur,
                    choices: cur.choices.map((c, i) => (i === ci ? e.target.value : c)),
                  }))
                }
                className={inputClass}
              />
              {canRemoveChoice ? (
                <button
                  type="button"
                  onClick={() =>
                    onUpdate((cur) => {
                      const choices = cur.choices.filter((_, i) => i !== ci);
                      let correctIndex = cur.correctIndex;
                      if (ci === cur.correctIndex) correctIndex = 0;
                      else if (ci < cur.correctIndex) correctIndex -= 1;
                      return { ...cur, choices, correctIndex };
                    })
                  }
                  className="text-[var(--muted-foreground)] hover:text-[var(--danger)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          );
        })}
        {canAddChoice ? (
          <Link
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onUpdate((cur) => ({ ...cur, choices: [...cur.choices, ""] }));
            }}
            className="inline-flex h-8 items-center gap-1 px-2 text-xs text-[var(--primary)] underline-offset-4 transition hover:text-[var(--primary)] hover:underline"
          >
            <Plus className="h-3.5 w-3.5 text-[var(--primary)]" />
            보기 추가
          </Link>
        ) : null}
      </div>

      {withScaffold ? (
        <details className="rounded-md border border-dashed border-[var(--border)] px-3 py-1">
          <summary className={cn("cursor-pointer py-2", formLabelClass, "text-[var(--muted-foreground)]")}>
            힌트·해설
          </summary>
          <div className="space-y-3 pb-2">
            <FormField label="1차 오답 힌트" htmlFor={`q-hint1-${q.localId}`}>
              <Input
                id={`q-hint1-${q.localId}`}
                value={hint1}
                onChange={(e) =>
                  onUpdate((cur) => ({
                    ...cur,
                    hints: serializeEditorHints(e.target.value, parseEditorHints(cur.hints).hint2),
                  }))
                }
                placeholder="첫 번째 오답 시 보여줄 힌트"
                className={inputClass}
              />
            </FormField>
            <FormField label="2차 오답 힌트" htmlFor={`q-hint2-${q.localId}`}>
              <Input
                id={`q-hint2-${q.localId}`}
                value={hint2}
                onChange={(e) =>
                  onUpdate((cur) => ({
                    ...cur,
                    hints: serializeEditorHints(parseEditorHints(cur.hints).hint1, e.target.value),
                  }))
                }
                placeholder="두 번째 오답 시 보여줄 힌트"
                className={inputClass}
              />
            </FormField>
            <FormField label="해설" htmlFor={`q-explanation-${q.localId}`}>
              <Textarea
                id={`q-explanation-${q.localId}`}
                rows={2}
                value={q.explanation}
                onChange={(e) => onUpdate((cur) => ({ ...cur, explanation: e.target.value }))}
                className={textareaClass}
              />
            </FormField>
          </div>
        </details>
      ) : null}
    </div>
  );
}

const questionSectionStyles = {
  practice: {
    panel:
      "border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_5%,var(--card-bg))]",
    accent: "border-l-4 border-l-[var(--primary)]",
    badge: "bg-[var(--tint-primary-medium)] text-[var(--primary)]",
    badgeLabel: "연습",
  },
  test: {
    panel:
      "border-[color-mix(in_srgb,var(--highlight)_28%,var(--border))] bg-[color-mix(in_srgb,var(--highlight)_6%,var(--card-bg))]",
    accent: "border-l-4 border-l-[var(--highlight)]",
    badge: "bg-[var(--tint-highlight-medium)] text-[color-mix(in_srgb,var(--highlight)_85%,var(--foreground))]",
    badgeLabel: "실전",
  },
} as const;

function QuestionListEditor({
  variant,
  label,
  hint,
  questions,
  withScaffold,
  segment,
  activityTitle,
  aiKind,
  onChange,
}: {
  variant: keyof typeof questionSectionStyles;
  label: string;
  hint: string;
  questions: EditorQuestion[];
  withScaffold?: boolean;
  segment: string;
  activityTitle: string;
  aiKind: QuestionKind;
  onChange: (next: EditorQuestion[]) => void;
}) {
  const canRemove = questions.length > MIN_QUESTIONS_PER_ROLE;
  const section = questionSectionStyles[variant];

  const updateQuestion = (localId: string, updater: (q: EditorQuestion) => EditorQuestion) => {
    onChange(questions.map((q) => (q.localId === localId ? updater(q) : q)));
  };

  return (
    <section
      className={cn(
        "space-y-4 rounded-xl border p-4",
        section.panel,
        section.accent,
      )}
      aria-labelledby={`${variant}-questions-heading`}
    >
      <div className="space-y-1 border-b border-[var(--border)]/80 pb-3">
        <span
          className={cn(
            "inline-block rounded-md px-2 py-0.5 text-xs font-bold tracking-wide",
            section.badge,
          )}
        >
          {section.badgeLabel}
        </span>
        <h4
          id={`${variant}-questions-heading`}
          className="text-sm font-semibold text-[var(--foreground)]"
        >
          {label}
        </h4>
        <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>
      </div>

      <div className="space-y-3">
        {questions.map((q, qIdx) => (
          <div
            key={q.localId}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--elevation-sm)]"
          >
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
              <span className="text-xs font-semibold text-[var(--foreground)]">
                {editorQuestionLabel(qIdx)}
              </span>
              <div className="flex items-center gap-1">
                <QuestionAIGenerateButton
                  segment={segment}
                  activityTitle={activityTitle}
                  kind={aiKind}
                  existingPrompts={questions
                    .filter((item) => item.localId !== q.localId)
                    .map((item) => item.prompt.trim())
                    .filter(Boolean)}
                  onGenerated={(generated) =>
                    updateQuestion(q.localId, (cur) => mergeGeneratedQuestion(cur, generated))
                  }
                />
                {canRemove ? (
                  <button
                    type="button"
                    onClick={() => onChange(questions.filter((item) => item.localId !== q.localId))}
                    className="rounded p-1.5 text-[var(--muted-foreground)] hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] hover:text-[var(--danger)]"
                    title="문항 삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
            <SingleQuestionEditor
              question={q}
              withScaffold={withScaffold}
              onUpdate={(updater) => updateQuestion(q.localId, updater)}
            />
          </div>
        ))}
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 w-full gap-1 border-[var(--border)] bg-[var(--card-bg)] text-xs"
        onClick={() => onChange([...questions, createEmptyQuestion()])}
      >
        <Plus className="h-3.5 w-3.5" />
        {label} 추가
      </Button>
    </section>
  );
}

function LearningContentBlock({
  role,
  roleIndex,
  activityTitle,
  canRemove,
  onChange,
  onRemove,
}: {
  role: EditorRole;
  roleIndex: number;
  activityTitle: string;
  canRemove: boolean;
  onChange: (role: EditorRole) => void;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{editorRoleLabel(roleIndex)}</h3>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--danger)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            삭제
          </button>
        ) : null}
      </div>

      <div className="space-y-5">
        <FormField label="학습 내용" htmlFor={`segment-${role.localId}`}>
          <Textarea
            id={`segment-${role.localId}`}
            rows={8}
            value={role.segment}
            onChange={(e) => onChange({ ...role, segment: e.target.value })}
            placeholder="학습할 내용을 입력하세요."
            className={cn(textareaClass, "min-h-[5rem]")}
          />
        </FormField>

        <div className="space-y-5">
          <QuestionListEditor
            variant="practice"
            label="연습 문제"
            hint={EDITOR_QUESTION_HINTS.practice}
            questions={role.practiceQuestions}
            withScaffold
            segment={role.segment}
            activityTitle={activityTitle}
            aiKind="practice"
            onChange={(next) => onChange({ ...role, practiceQuestions: next })}
          />

          <QuestionListEditor
            variant="test"
            label="실전 문제"
            hint={EDITOR_QUESTION_HINTS.test}
            questions={role.testQuestions}
            segment={role.segment}
            activityTitle={activityTitle}
            aiKind="test"
            onChange={(next) => onChange({ ...role, testQuestions: next })}
          />
        </div>
      </div>
    </article>
  );
}

function roleHasContent(role: EditorRole): boolean {
  if (role.segment.trim()) return true;
  const questions = [...role.practiceQuestions, ...role.testQuestions];
  return questions.some((q) => q.prompt.trim());
}

export function ActivityEditorForm({ draft, onChange }: Props) {
  const [activeRoleId, setActiveRoleId] = useState(draft.roles[0]?.localId ?? "");
  const canAddRole = draft.roles.length < MAX_ROLES_PER_GROUP;
  const canRemoveRole = draft.roles.length > MIN_ROLES_PER_GROUP;

  useEffect(() => {
    if (!draft.roles.some((r) => r.localId === activeRoleId)) {
      setActiveRoleId(draft.roles[0]?.localId ?? "");
    }
  }, [draft.roles, activeRoleId]);

  const activeIndex = draft.roles.findIndex((r) => r.localId === activeRoleId);
  const activeRole = activeIndex >= 0 ? draft.roles[activeIndex] : draft.roles[0];

  const updateRole = (localId: string, role: EditorRole) => {
    onChange({
      ...draft,
      roles: draft.roles.map((r) => (r.localId === localId ? role : r)),
    });
  };

  const addRole = () => {
    const role = createEmptyRole();
    onChange({ ...draft, roles: [...draft.roles, role] });
    setActiveRoleId(role.localId);
  };

  const removeRole = (localId: string) => {
    const nextRoles = draft.roles.filter((r) => r.localId !== localId);
    onChange({ ...draft, roles: nextRoles });
    if (activeRoleId === localId) {
      setActiveRoleId(nextRoles[0]?.localId ?? "");
    }
  };

  return (
    <div className="w-full space-y-6">
      <FormField label="활동 제목" htmlFor="activity-title">
        <Input
          id="activity-title"
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          placeholder="활동 제목을 입력하세요"
          className={inputClass}
        />
      </FormField>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">학습 내용</h2>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              다음의 순서로 활동이 진행됩니다:
              <br />
              1. 역할 맡기 → 2. 깊게 파고들기 (전문가 집단 활동) → 3. 서로 알려주기 (홈 집단 활동) → 4. 실력 확인하기 (개별 활동) → 5. 점수 및 순위 공개
              <br />
              각 전문가 집단이 학습할 내용 및 연습할 문제, 마지막으로 개별적으로 풀 실전 문제를 작성하세요.
            </p>
          </div>
          {canAddRole ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 gap-1 text-xs"
              onClick={addRole}
            >
              <Plus className="h-3.5 w-3.5" />
              추가
            </Button>
          ) : null}
        </div>

        <div
          className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="학습 내용 선택"
        >
          {draft.roles.map((role, rIdx) => {
            const isActive = role.localId === activeRoleId;
            const done = roleHasContent(role);
            return (
              <button
                key={role.localId}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveRoleId(role.localId)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  isActive
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]"
                    : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    done
                      ? isActive
                        ? "bg-[var(--on-primary)]"
                        : "bg-[var(--primary)]"
                      : isActive
                        ? "bg-[var(--on-primary)]/50"
                        : "bg-[var(--border)]",
                  )}
                  aria-hidden
                />
                {editorRoleLabel(rIdx)}
              </button>
            );
          })}
        </div>

        {activeRole && activeIndex >= 0 ? (
          <LearningContentBlock
            key={activeRole.localId}
            role={activeRole}
            roleIndex={activeIndex}
            activityTitle={draft.title}
            canRemove={canRemoveRole}
            onChange={(next) => updateRole(activeRole.localId, next)}
            onRemove={() => removeRole(activeRole.localId)}
          />
        ) : null}
      </div>
    </div>
  );
}
