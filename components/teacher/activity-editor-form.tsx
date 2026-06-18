"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Plus,
  Trash2,
  X,
  CheckCircle2,
  Circle,
  Sparkles,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmModal } from "@/components/ui/confirm-modal";
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
import { EDITOR_QUESTION_HINTS } from "@/lib/activity-phases";
import { cn } from "@/lib/utils";
import { LearningContentAIModal } from "@/components/teacher/learning-content-ai-modal";

type Props = {
  draft: ActivityEditorDraft;
  onChange: (draft: ActivityEditorDraft) => void;
};

type QuestionKind = "practice" | "test";

const inputClass = "h-9 w-full text-sm";
const textareaClass = "resize-y text-sm";

const editorSectionStyles = {
  segment: {
    badge: "bg-[var(--tint-accent-medium)] text-[var(--accent)]",
    badgeLabel: "지문",
    accent: "border-l-[var(--accent)]",
  },
  practice: {
    badge: "bg-[var(--tint-primary-medium)] text-[var(--primary)]",
    badgeLabel: "연습",
    accent: "border-l-[var(--primary)]",
  },
  test: {
    badge: "bg-[var(--tint-highlight-medium)] text-[color-mix(in_srgb,var(--highlight)_85%,var(--foreground))]",
    badgeLabel: "실전",
    accent: "border-l-[var(--highlight)]",
  },
} as const;

type EditorSectionVariant = keyof typeof editorSectionStyles;

function EditorSectionBlock({
  variant,
  label,
  hint,
  headingId,
  headerActions,
  children,
}: {
  variant: EditorSectionVariant;
  label: string;
  hint: string;
  headingId: string;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  const section = editorSectionStyles[variant];

  return (
    <Card
      aria-labelledby={headingId}
      className={cn("border-l-4 shadow-none", section.accent)}
    >
      <CardContent className="space-y-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-block rounded-md px-2 py-0.5 text-xs font-bold tracking-wide",
                  section.badge,
                )}
              >
                {section.badgeLabel}
              </span>
              <h3 id={headingId} className="text-sm font-semibold text-[var(--foreground)]">
                {label}
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">{hint}</p>
          </div>
          {headerActions ? <div className="flex shrink-0 items-center gap-1">{headerActions}</div> : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function QuestionBlock({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg bg-[color-mix(in_srgb,var(--tint-primary-weak)_45%,var(--card-bg))] p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--foreground)]">{title}</span>
        {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

function RoleTabList({
  roles,
  activeRoleId,
  canAddRole,
  canRemoveRole,
  onSelect,
  onAdd,
  onRemove,
}: {
  roles: EditorRole[];
  activeRoleId: string;
  canAddRole: boolean;
  canRemoveRole: boolean;
  onSelect: (localId: string) => void;
  onAdd: () => void;
  onRemove: (localId: string) => void;
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const pendingDeleteIndex = pendingDeleteId
    ? roles.findIndex((r) => r.localId === pendingDeleteId)
    : -1;
  const pendingDeleteRole = pendingDeleteIndex >= 0 ? roles[pendingDeleteIndex] : null;
  const pendingDeleteLabel =
    pendingDeleteIndex >= 0 ? editorRoleLabel(pendingDeleteIndex) : "";

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return;
    onRemove(pendingDeleteId);
    setPendingDeleteId(null);
  };

  return (
    <>
      <div className="flex flex-wrap items-end gap-1" role="tablist" aria-label="역할 선택">
      {roles.map((role, rIdx) => {
        const isActive = role.localId === activeRoleId;
        const done = roleHasContent(role);
        const label = editorRoleLabel(rIdx);

        return (
          <div
            key={role.localId}
            className={cn(
              "group/tab inline-flex shrink-0 items-center rounded-t-lg border transition-colors",
              isActive
                ? "relative z-10 -mb-px border-[var(--border)] border-b-[var(--card-bg)] bg-[var(--card-bg)]"
                : "border-transparent",
            )}
          >
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              id={`role-tab-${role.localId}`}
              aria-controls={`role-panel-${role.localId}`}
              onClick={() => onSelect(role.localId)}
              className={cn(
                "inline-flex items-center gap-1.5 py-2.5 pl-4 text-xs font-semibold transition-colors",
                canRemoveRole ? "pr-1.5" : "pr-4",
                isActive
                  ? "text-[var(--primary)]"
                  : "rounded-t-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  done ? "bg-[var(--primary)]" : "bg-[var(--border)]",
                )}
                aria-hidden
              />
              {label}
            </button>
            {canRemoveRole ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDeleteId(role.localId);
                }}
                aria-label={`${label} 삭제`}
                className={cn(
                  "mr-2 rounded-sm p-0.5 text-[var(--muted-foreground)] transition-opacity hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] hover:text-[var(--danger)]",
                  isActive
                    ? "opacity-70 hover:opacity-100"
                    : "opacity-0 group-hover/tab:opacity-70 group-hover/tab:hover:opacity-100",
                )}
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            ) : (
              <span className="w-1" aria-hidden />
            )}
          </div>
        );
      })}

      {canAddRole ? (
        <button
          type="button"
          className="mb-0.5 inline-flex shrink-0 items-center gap-1 rounded-t-md px-3 py-2 text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_6%,var(--card-bg))]"
          onClick={onAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          역할 추가
        </button>
      ) : null}
      </div>

      <ConfirmModal
        open={pendingDeleteId !== null}
        title="역할 삭제"
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
      >
        <p className="text-sm text-[var(--foreground)]">
          <span className="font-semibold">{pendingDeleteLabel}</span>을(를) 삭제할까요?
        </p>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {pendingDeleteRole && roleHasContent(pendingDeleteRole)
            ? "작성된 학습 지문과 문항도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
            : "이 작업은 되돌릴 수 없습니다."}
        </p>
      </ConfirmModal>
    </>
  );
}

function questionHasContent(question: EditorQuestion): boolean {
  if (question.prompt.trim()) return true;
  if (question.choices.some((choice) => choice.trim())) return true;
  if (question.hints.trim() || question.explanation.trim()) return true;
  return false;
}

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
    id: generated.id,
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
      if (!generated?.prompt.trim()) throw new Error("생성된 문항이 없습니다.");
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
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--primary)]" />
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
      <FormField label="발문" htmlFor={`q-prompt-${q.localId}`} required>
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
        <p className={formLabelClass}>
          보기
          <span className="text-[var(--danger)]" aria-hidden>
            {" "}
            *
          </span>
        </p>
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
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 gap-1 px-2 text-xs text-[var(--primary)]"
            onClick={() => onUpdate((cur) => ({ ...cur, choices: [...cur.choices, ""] }))}
          >
            <Plus className="h-3.5 w-3.5" />
            보기 추가
          </Button>
        ) : null}
      </div>

      {withScaffold ? (
        <details open className="rounded-md border border-dashed border-[var(--border)] px-3 py-1">
          <summary className={cn("cursor-pointer py-2", formLabelClass, "text-[var(--muted-foreground)]")}>
            힌트·해설
          </summary>
          <div className="space-y-3 pb-2">
            <FormField label="1차 오답 힌트" htmlFor={`q-hint1-${q.localId}`} required>
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
            <FormField label="2차 오답 힌트" htmlFor={`q-hint2-${q.localId}`} required>
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
            <FormField label="해설" htmlFor={`q-explanation-${q.localId}`} required>
              <Textarea
                id={`q-explanation-${q.localId}`}
                rows={2}
                value={q.explanation}
                onChange={(e) => onUpdate((cur) => ({ ...cur, explanation: e.target.value }))}
                className={cn(textareaClass, "min-h-[2.5rem]")}
              />
            </FormField>
          </div>
        </details>
      ) : null}
    </div>
  );
}

function SegmentEditor({
  role,
  activityTitle,
  onChange,
}: {
  role: EditorRole;
  activityTitle: string;
  onChange: (role: EditorRole) => void;
}) {
  const [aiModalOpen, setAiModalOpen] = useState(false);

  return (
    <>
      <EditorSectionBlock
        variant="segment"
        label="학습 지문"
        hint={EDITOR_QUESTION_HINTS.segment}
        headingId={`segment-${role.localId}-heading`}
        headerActions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2 text-xs"
            onClick={() => setAiModalOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
            AI 생성
          </Button>
        }
      >
        <Textarea
          id={`segment-${role.localId}`}
          rows={8}
          value={role.segment}
          onChange={(e) => onChange({ ...role, segment: e.target.value })}
          placeholder="학습할 내용을 입력하세요."
          aria-label="학습 내용"
          className={cn(textareaClass, "min-h-[5rem]")}
        />
      </EditorSectionBlock>

      <LearningContentAIModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        activityTitle={activityTitle}
        onGenerated={(segment: string) => onChange({ ...role, segment })}
      />
    </>
  );
}

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
  variant: Exclude<EditorSectionVariant, "segment">;
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
  const [pendingDeleteQuestionId, setPendingDeleteQuestionId] = useState<string | null>(null);

  const pendingDeleteIndex = pendingDeleteQuestionId
    ? questions.findIndex((q) => q.localId === pendingDeleteQuestionId)
    : -1;
  const pendingDeleteQuestion =
    pendingDeleteIndex >= 0 ? questions[pendingDeleteIndex] : null;
  const pendingDeleteLabel =
    pendingDeleteIndex >= 0 ? editorQuestionLabel(pendingDeleteIndex) : "";

  const updateQuestion = (localId: string, updater: (q: EditorQuestion) => EditorQuestion) => {
    onChange(questions.map((q) => (q.localId === localId ? updater(q) : q)));
  };

  const handleConfirmDeleteQuestion = () => {
    if (!pendingDeleteQuestionId) return;
    onChange(questions.filter((item) => item.localId !== pendingDeleteQuestionId));
    setPendingDeleteQuestionId(null);
  };

  return (
    <>
    <EditorSectionBlock
      variant={variant}
      label={label}
      hint={hint}
      headingId={`${variant}-questions-heading`}
    >
      <div className="space-y-3">
        {questions.map((q, qIdx) => (
          <QuestionBlock
            key={q.localId}
            title={editorQuestionLabel(qIdx)}
            actions={
              <>
                <QuestionAIGenerateButton
                  segment={segment}
                  activityTitle={activityTitle}
                  kind={aiKind}
                  existingPrompts={questions
                    .map((item) => item.prompt.trim())
                    .filter(Boolean)}
                  onGenerated={(generated) =>
                    updateQuestion(q.localId, (cur) => mergeGeneratedQuestion(cur, generated))
                  }
                />
                {canRemove ? (
                  <button
                    type="button"
                    onClick={() => setPendingDeleteQuestionId(q.localId)}
                    className="rounded p-1.5 text-[var(--muted-foreground)] hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] hover:text-[var(--danger)]"
                    title="문항 삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </>
            }
          >
            <SingleQuestionEditor
              question={q}
              withScaffold={withScaffold}
              onUpdate={(updater) => updateQuestion(q.localId, updater)}
            />
          </QuestionBlock>
        ))}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-full gap-1 border-dashed text-xs"
          onClick={() => onChange([...questions, createEmptyQuestion()])}
        >
          <Plus className="h-3.5 w-3.5" />
          {label} 추가
        </Button>
      </div>
    </EditorSectionBlock>

    <ConfirmModal
      open={pendingDeleteQuestionId !== null}
      title="문항 삭제"
      onClose={() => setPendingDeleteQuestionId(null)}
      onConfirm={handleConfirmDeleteQuestion}
    >
      <p className="text-sm text-[var(--foreground)]">
        <span className="font-semibold">{pendingDeleteLabel}</span>을(를) 삭제할까요?
      </p>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        {pendingDeleteQuestion && questionHasContent(pendingDeleteQuestion)
          ? "작성된 발문·보기·힌트·해설도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
          : "이 작업은 되돌릴 수 없습니다."}
      </p>
    </ConfirmModal>
    </>
  );
}

function LearningContentBlock({
  role,
  activityTitle,
  onChange,
}: {
  role: EditorRole;
  activityTitle: string;
  onChange: (role: EditorRole) => void;
}) {
  return (
    <div className="space-y-4">
      <SegmentEditor role={role} activityTitle={activityTitle} onChange={onChange} />

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
    <div className="w-full space-y-8">
      <Card>
        <CardContent className="py-5">
          <FormField label="활동 제목" htmlFor="activity-title" required>
            <Input
              id="activity-title"
              value={draft.title}
              onChange={(e) => onChange({ ...draft, title: e.target.value })}
              placeholder="활동 제목을 입력하세요"
              className={inputClass}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-0 p-0">
          <div className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--tint-primary-weak)_28%,var(--card-bg))] px-5 pt-4">
            <RoleTabList
              roles={draft.roles}
              activeRoleId={activeRoleId}
              canAddRole={canAddRole}
              canRemoveRole={canRemoveRole}
              onSelect={setActiveRoleId}
              onAdd={addRole}
              onRemove={removeRole}
            />
          </div>

          <p className="px-5 pt-5 text-xs leading-relaxed text-[var(--muted-foreground)]">
            각 역할마다 학습 지문, 연습 문제, 실전 문제를 작성하세요.
          </p>

          {activeRole && activeIndex >= 0 ? (
            <div
              id={`role-panel-${activeRole.localId}`}
              role="tabpanel"
              aria-labelledby={`role-tab-${activeRole.localId}`}
              className="space-y-4 p-5"
            >
              <LearningContentBlock
                key={activeRole.localId}
                role={activeRole}
                activityTitle={draft.title}
                onChange={(next) => updateRole(activeRole.localId, next)}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
