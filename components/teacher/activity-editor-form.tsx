"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { LearningContentAIModal } from "@/components/teacher/learning-content-ai-modal";
import {
  activityEditorChipActive,
  activityEditorChoiceCorrect,
  activityEditorChoicePreviewCorrect,
  activityEditorHeaderBg,
  activityEditorNumberBadge,
  activityEditorQuestionCard,
  activityEditorQuestionCardEditing,
  activityEditorQuestionCardToolbar,
  activityEditorQuestionHeaderBorder,
  activityEditorQuestionPanelBg,
  activityEditorSegmentFieldClass,
  activityEditorSegmentHeaderBorder,
  activityEditorSegmentPanelBg,
  playPhaseSectionShell,
} from "@/components/activity/activity-layout-chrome";

type Props = {
  draft: ActivityEditorDraft;
  onChange: (draft: ActivityEditorDraft) => void;
};

type QuestionKind = "practice" | "test";

const inputClass = "h-9 w-full text-sm";
const textareaClass = "resize-y text-sm";

function EditorDeleteButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "shrink-0 text-[var(--muted-foreground)] hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] hover:text-[var(--danger)]",
        className,
      )}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

function roleNavTabShellClass(isActive: boolean) {
  return cn(
    "relative -mb-px inline-flex shrink-0 items-center rounded-t-lg border border-b-0",
    isActive
      ? "z-10 border-[var(--border)] border-b-[var(--background)] bg-[var(--background)]"
      : "border-transparent",
  );
}

function RoleNav({
  roles,
  activeRoleId,
  canAddRole,
  canRemoveRole,
  onSelect,
  onAdd,
  onRequestDelete,
}: {
  roles: EditorRole[];
  activeRoleId: string;
  canAddRole: boolean;
  canRemoveRole: boolean;
  onSelect: (localId: string) => void;
  onAdd: () => void;
  onRequestDelete: (localId: string) => void;
}) {
  const completedCount = roles.filter((role) => roleHasContent(role)).length;

  return (
    <nav
      className={cn(
        "flex shrink-0 items-end justify-between gap-3 border-b border-[var(--border)] px-3 pt-1.5 sm:px-4",
        activityEditorHeaderBg,
      )}
      aria-label="학습 내용 선택"
    >
      <div
        className="flex min-w-0 flex-1 items-end gap-0 overflow-x-auto overscroll-x-contain pb-px"
        role="tablist"
      >
        {roles.map((role, rIdx) => {
          const isActive = role.localId === activeRoleId;
          const label = editorRoleLabel(rIdx);
          const done = roleHasContent(role);

          return (
            <div key={role.localId} className={roleNavTabShellClass(isActive)}>
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                id={`role-tab-${role.localId}`}
                aria-controls={`role-panel-${role.localId}`}
                onClick={() => onSelect(role.localId)}
                className={cn(
                  "inline-flex items-center gap-2 py-2.5 text-sm font-semibold",
                  canRemoveRole && isActive ? "pl-3.5 pr-1 sm:pl-4" : "px-3.5 sm:px-4",
                  isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]",
                )}
              >
                <TabStatusDot done={done} />
                <span className="whitespace-nowrap">{label}</span>
              </button>
              {canRemoveRole && isActive ? (
                <EditorDeleteButton
                  label={`${label} 삭제`}
                  onClick={() => onRequestDelete(role.localId)}
                  className="mr-2 h-7 w-7"
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-2 pb-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs tabular-nums",
            completedCount === roles.length
              ? "bg-[var(--tint-primary-medium)] font-medium text-[var(--primary)]"
              : "border border-[var(--border)] bg-[var(--surface)] text-[var(--primary-muted)]",
          )}
        >
          {completedCount}/{roles.length}
        </span>
        {canAddRole ? (
          <Button type="button" variant="outline" size="sm" onClick={onAdd} className="mb-0.5 h-7 gap-1 px-2.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            역할 추가
          </Button>
        ) : null}
      </div>
    </nav>
  );
}

function QuestionNumber({ index, className }: { index: number; className?: string }) {
  return (
    <span className={cn(activityEditorNumberBadge, className)} aria-hidden>
      {index + 1}
    </span>
  );
}

function TabStatusDot({ done }: { done: boolean }) {
  return (
    <span
      className={cn("h-1.5 w-1.5 rounded-full", done ? "bg-[var(--primary)]" : "bg-[var(--border)]")}
      aria-hidden
    />
  );
}

function roleHasContent(role: EditorRole): boolean {
  if (role.segment.trim()) return true;
  return [...role.practiceQuestions, ...role.testQuestions].some((q) => q.prompt.trim());
}

function questionHasContent(question: EditorQuestion): boolean {
  if (question.prompt.trim()) return true;
  if (question.choices.some((c) => c.trim())) return true;
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

function AIGenerateButton({
  segment,
  activityTitle,
  kind,
  existingPrompts,
  onGenerated,
  label = "AI 생성",
}: {
  segment: string;
  activityTitle: string;
  kind?: QuestionKind;
  existingPrompts?: string[];
  onGenerated: (question: EditorQuestion) => void;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!segment.trim()) {
      setError("학습 지문을 먼저 입력하세요.");
      return;
    }
    if (!kind || !existingPrompts) return;
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

  if (!kind) return null;

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
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {label}
      </Button>
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}

function SingleQuestionEditor({
  question: q,
  qIdx,
  withScaffold,
  showNumber = true,
  onUpdate,
  className,
}: {
  question: EditorQuestion;
  qIdx: number;
  withScaffold?: boolean;
  showNumber?: boolean;
  onUpdate: (updater: (q: EditorQuestion) => EditorQuestion) => void;
  className?: string;
}) {
  const canAddChoice = q.choices.length < MAX_CHOICES_PER_QUESTION;
  const canRemoveChoice = q.choices.length > MIN_CHOICES_PER_QUESTION;
  const { hint1, hint2 } = parseEditorHints(q.hints);

  return (
    <div className={cn(showNumber ? "flex items-start gap-3" : "min-w-0", className)}>
      {showNumber ? <QuestionNumber index={qIdx} /> : null}
      <div className="min-w-0 flex-1 space-y-3">
        <Textarea
          id={`q-prompt-${q.localId}`}
          rows={2}
          value={q.prompt}
          onChange={(e) => onUpdate((cur) => ({ ...cur, prompt: e.target.value }))}
          placeholder="발문을 입력하세요"
          aria-label={`${qIdx + 1}번 발문`}
          className={cn(textareaClass, "min-h-[2.75rem]")}
        />

        <div className="space-y-1.5">
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
                    isCorrect ? activityEditorChoiceCorrect : "border-[var(--border)] text-[var(--muted-foreground)]",
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
                  <EditorDeleteButton
                    label="보기 삭제"
                    onClick={() =>
                      onUpdate((cur) => {
                        const choices = cur.choices.filter((_, i) => i !== ci);
                        let correctIndex = cur.correctIndex;
                        if (ci === cur.correctIndex) correctIndex = 0;
                        else if (ci < cur.correctIndex) correctIndex -= 1;
                        return { ...cur, choices, correctIndex };
                      })
                    }
                    className="h-8 w-8"
                  />
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
          <details className="rounded-md border border-[var(--border)] px-3 py-1">
            <summary className={cn("cursor-pointer py-2", formLabelClass, "text-[var(--muted-foreground)]")}>
              힌트·해설
            </summary>
            <div className="space-y-3 pb-2">
              <FormField label="1차 오답 힌트" htmlFor={`q-h1-${q.localId}`} required>
                <Input
                  id={`q-h1-${q.localId}`}
                  value={hint1}
                  onChange={(e) =>
                    onUpdate((cur) => ({
                      ...cur,
                      hints: serializeEditorHints(e.target.value, parseEditorHints(cur.hints).hint2),
                    }))
                  }
                  className={inputClass}
                />
              </FormField>
              <FormField label="2차 오답 힌트" htmlFor={`q-h2-${q.localId}`} required>
                <Input
                  id={`q-h2-${q.localId}`}
                  value={hint2}
                  onChange={(e) =>
                    onUpdate((cur) => ({
                      ...cur,
                      hints: serializeEditorHints(parseEditorHints(cur.hints).hint1, e.target.value),
                    }))
                  }
                  className={inputClass}
                />
              </FormField>
              <FormField label="해설" htmlFor={`q-ex-${q.localId}`} required>
                <Textarea
                  id={`q-ex-${q.localId}`}
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
    </div>
  );
}

function QuestionPreview({
  question,
  qIdx,
  withScaffold,
  showNumber = true,
}: {
  question: EditorQuestion;
  qIdx: number;
  withScaffold?: boolean;
  showNumber?: boolean;
}) {
  const promptEmpty = !question.prompt.trim();
  const { hint1, hint2 } = parseEditorHints(question.hints);
  const hasScaffold = Boolean(hint1.trim() || hint2.trim() || question.explanation.trim());

  return (
    <div className={cn(showNumber ? "flex items-start gap-3 select-none" : "select-none")}>
      {showNumber ? <QuestionNumber index={qIdx} /> : null}
      <div className="min-w-0 flex-1 space-y-3">
        <p
          className={cn(
            "text-sm leading-relaxed text-[var(--foreground)]",
            promptEmpty && "italic text-[var(--muted-foreground)]",
          )}
        >
          {promptEmpty ? "발문을 입력하세요" : question.prompt}
        </p>
        <div className="space-y-2">
        {question.choices.map((choice, ci) => {
          const isCorrect = question.correctIndex === ci;
          const choiceEmpty = !choice.trim();
          return (
            <div key={ci} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                  isCorrect ? activityEditorChoicePreviewCorrect : "border-[var(--border)] bg-[var(--surface)]",
                )}
                aria-hidden
              >
                {isCorrect ? (
                  <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                ) : null}
              </span>
              <span
                className={cn(
                  "text-sm text-[var(--foreground)]",
                  choiceEmpty && "italic text-[var(--muted-foreground)]",
                )}
              >
                {choiceEmpty ? `${CHOICE_LABELS[ci] ?? ci + 1}번 보기` : choice}
              </span>
            </div>
          );
        })}
      </div>
      {withScaffold && hasScaffold ? (
        <p className="text-xs text-[var(--muted-foreground)]">힌트·해설 설정됨</p>
      ) : null}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  qIdx,
  isEditing,
  withScaffold,
  segment,
  activityTitle,
  aiKind,
  canRemove,
  existingPrompts,
  onEdit,
  onUpdate,
  onDeleteRequest,
}: {
  question: EditorQuestion;
  qIdx: number;
  isEditing: boolean;
  withScaffold?: boolean;
  segment: string;
  activityTitle: string;
  aiKind: QuestionKind;
  canRemove: boolean;
  existingPrompts: string[];
  onEdit: () => void;
  onUpdate: (updater: (q: EditorQuestion) => EditorQuestion) => void;
  onDeleteRequest: () => void;
}) {
  const cardClass = cn(
    activityEditorQuestionCard,
    isEditing && activityEditorQuestionCardEditing,
    !isEditing &&
      "cursor-pointer transition-[box-shadow] hover:shadow-[var(--elevation-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring-focus)]",
  );

  const toolbar = (
    <div className={activityEditorQuestionCardToolbar}>
      <QuestionNumber index={qIdx} className="mt-0" />
      {isEditing ? (
        <div className="flex shrink-0 items-center gap-1">
          <AIGenerateButton
            segment={segment}
            activityTitle={activityTitle}
            kind={aiKind}
            existingPrompts={existingPrompts}
            onGenerated={(generated) => onUpdate((cur) => mergeGeneratedQuestion(cur, generated))}
          />
          {canRemove ? (
            <EditorDeleteButton
              label={`${qIdx + 1}번 문항 삭제`}
              onClick={onDeleteRequest}
              className="h-8 w-8"
            />
          ) : null}
        </div>
      ) : (
        <span className="text-xs text-[var(--muted-foreground)]">클릭하여 편집</span>
      )}
    </div>
  );

  const content = isEditing ? (
    <SingleQuestionEditor
      question={question}
      qIdx={qIdx}
      withScaffold={withScaffold}
      showNumber={false}
      onUpdate={onUpdate}
      className="p-4"
    />
  ) : (
    <QuestionPreview
      question={question}
      qIdx={qIdx}
      withScaffold={withScaffold}
      showNumber={false}
    />
  );

  if (isEditing) {
    return (
      <div className={cardClass} onClick={(e) => e.stopPropagation()}>
        {toolbar}
        {content}
      </div>
    );
  }

  return (
    <button type="button" onClick={onEdit} className={cn(cardClass, "w-full text-left")} aria-label={`${qIdx + 1}번 문항 편집`}>
      {toolbar}
      <div className="p-4 pt-3">{content}</div>
    </button>
  );
}

function QuestionListEditor({
  questions,
  withScaffold,
  segment,
  activityTitle,
  aiKind,
  onChange,
}: {
  questions: EditorQuestion[];
  withScaffold?: boolean;
  segment: string;
  activityTitle: string;
  aiKind: QuestionKind;
  onChange: (next: EditorQuestion[]) => void;
}) {
  const canRemove = questions.length > MIN_QUESTIONS_PER_ROLE;
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (editingQuestionId && !questions.some((q) => q.localId === editingQuestionId)) {
      setEditingQuestionId(questions[0]?.localId ?? null);
    }
  }, [questions, editingQuestionId]);

  const pendingIndex = pendingDeleteId ? questions.findIndex((q) => q.localId === pendingDeleteId) : -1;
  const pendingQuestion = pendingIndex >= 0 ? questions[pendingIndex] : null;
  const pendingLabel = pendingIndex >= 0 ? editorQuestionLabel(pendingIndex) : "";

  const updateQuestion = (localId: string, updater: (q: EditorQuestion) => EditorQuestion) => {
    onChange(questions.map((q) => (q.localId === localId ? updater(q) : q)));
  };

  const addQuestion = () => {
    const question = createEmptyQuestion();
    onChange([...questions, question]);
    setEditingQuestionId(question.localId);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return;
    const next = questions.filter((q) => q.localId !== pendingDeleteId);
    onChange(next);
    if (editingQuestionId === pendingDeleteId) {
      setEditingQuestionId(next[0]?.localId ?? null);
    }
    setPendingDeleteId(null);
  };

  const existingPrompts = questions.map((item) => item.prompt.trim()).filter(Boolean);

  return (
    <>
      <div className="flex flex-col gap-4">
        {questions.map((q, qIdx) => (
          <QuestionCard
            key={q.localId}
            question={q}
            qIdx={qIdx}
            isEditing={editingQuestionId === q.localId}
            withScaffold={withScaffold}
            segment={segment}
            activityTitle={activityTitle}
            aiKind={aiKind}
            canRemove={canRemove}
            existingPrompts={existingPrompts}
            onEdit={() => setEditingQuestionId(q.localId)}
            onUpdate={(updater) => updateQuestion(q.localId, updater)}
            onDeleteRequest={() => setPendingDeleteId(q.localId)}
          />
        ))}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-10 w-full gap-1.5 border-dashed bg-[var(--surface-overlay)] text-sm"
          onClick={addQuestion}
        >
          <Plus className="h-4 w-4" />
          문항 추가
        </Button>
      </div>

      <ConfirmModal
        open={pendingDeleteId !== null}
        title="문항 삭제"
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
      >
        <p>{pendingLabel}을(를) 삭제할까요?</p>
        <p>
          {pendingQuestion && questionHasContent(pendingQuestion)
            ? "작성 내용이 함께 삭제되며 되돌릴 수 없습니다."
            : "이 작업은 되돌릴 수 없습니다."}
        </p>
      </ConfirmModal>
    </>
  );
}

function questionsHaveContent(questions: EditorQuestion[]): boolean {
  return questions.some((q) => questionHasContent(q));
}

function QuestionSectionTabs({
  active,
  practiceQuestions,
  testQuestions,
  onSelect,
}: {
  active: QuestionKind;
  practiceQuestions: EditorQuestion[];
  testQuestions: EditorQuestion[];
  onSelect: (kind: QuestionKind) => void;
}) {
  const tabs: { key: QuestionKind; label: string; done: boolean; count: number }[] = [
    {
      key: "practice",
      label: "연습 문제",
      done: questionsHaveContent(practiceQuestions),
      count: practiceQuestions.length,
    },
    {
      key: "test",
      label: "실전 문제",
      done: questionsHaveContent(testQuestions),
      count: testQuestions.length,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="문제 유형">
      {tabs.map(({ key, label, done, count }) => {
        const isActive = active === key;
        return (
          <Button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            id={`question-tab-${key}`}
            aria-controls={`question-panel-${key}`}
            variant="chip"
            size="sm"
            onClick={() => onSelect(key)}
            className={cn(
              "gap-1.5",
              isActive ? activityEditorChipActive : "hover:border-[var(--border)] hover:bg-[var(--tint-primary-weak)]",
            )}
          >
            <TabStatusDot done={done} />
            {label}
            <span className="text-xs opacity-70">{count}</span>
          </Button>
        );
      })}
    </div>
  );
}

function RoleContent({
  role,
  activityTitle,
  onChange,
}: {
  role: EditorRole;
  activityTitle: string;
  onChange: (role: EditorRole) => void;
}) {
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [activeQuestionKind, setActiveQuestionKind] = useState<QuestionKind>("practice");

  const cardClass = cn(playPhaseSectionShell, "flex min-h-0 flex-col");

  return (
    <>
      <div className="flex h-full min-h-0 flex-1 gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4">
        <section
          className={cn(
            cardClass,
            activityEditorSegmentPanelBg,
            "h-full w-[34%] max-w-sm shrink-0",
          )}
        >
          <div className={cn("flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3", activityEditorSegmentHeaderBorder)}>
            <div>
              <p className="mt-1 text-base leading-relaxed">
                학습 지문
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
                전문가 집단에서 학습할 내용입니다.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 gap-1.5 px-3 text-xs"
              onClick={() => setAiModalOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI 생성
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
            <Textarea
              id={`segment-${role.localId}`}
              value={role.segment}
              onChange={(e) => onChange({ ...role, segment: e.target.value })}
              placeholder="학습 내용을 입력하세요."
              aria-label="학습 지문"
              className={cn(
                textareaClass,
                activityEditorSegmentFieldClass,
                "min-h-[20rem] flex-1 resize-none text-sm leading-relaxed",
              )}
            />
          </div>
        </section>

        <section className={cn(cardClass, activityEditorQuestionPanelBg, "h-full min-w-0 flex-1")}>
          <div className={cn("shrink-0 space-y-3 border-b px-4 py-3", activityEditorQuestionHeaderBorder)}>
            <QuestionSectionTabs
              active={activeQuestionKind}
              practiceQuestions={role.practiceQuestions}
              testQuestions={role.testQuestions}
              onSelect={setActiveQuestionKind}
            />
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
            {activeQuestionKind === "practice" ? "전문가 집단에서 학습할 연습 문제입니다." : "마지막에 개별적으로 풀 실전 문제입니다."}
            </p>
          </div>
          <div
            id={`question-panel-${activeQuestionKind}`}
            role="tabpanel"
            aria-labelledby={`question-tab-${activeQuestionKind}`}
            className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
          >
            {activeQuestionKind === "practice" ? (
              <QuestionListEditor
                key="practice"
                questions={role.practiceQuestions}
                withScaffold
                segment={role.segment}
                activityTitle={activityTitle}
                aiKind="practice"
                onChange={(next) => onChange({ ...role, practiceQuestions: next })}
              />
            ) : (
              <QuestionListEditor
                key="test"
                questions={role.testQuestions}
                segment={role.segment}
                activityTitle={activityTitle}
                aiKind="test"
                onChange={(next) => onChange({ ...role, testQuestions: next })}
              />
            )}
          </div>
        </section>
      </div>

      <LearningContentAIModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        activityTitle={activityTitle}
        onGenerated={(segment) => onChange({ ...role, segment })}
      />
    </>
  );
}

export function ActivityEditorForm({ draft, onChange }: Props) {
  const [activeRoleId, setActiveRoleId] = useState(draft.roles[0]?.localId ?? "");
  const [pendingDeleteRoleId, setPendingDeleteRoleId] = useState<string | null>(null);
  const canAddRole = draft.roles.length < MAX_ROLES_PER_GROUP;
  const canRemoveRole = draft.roles.length > MIN_ROLES_PER_GROUP;

  useEffect(() => {
    if (!draft.roles.some((r) => r.localId === activeRoleId)) {
      setActiveRoleId(draft.roles[0]?.localId ?? "");
    }
  }, [draft.roles, activeRoleId]);

  const activeIndex = draft.roles.findIndex((r) => r.localId === activeRoleId);
  const activeRole = activeIndex >= 0 ? draft.roles[activeIndex] : draft.roles[0];

  const pendingDeleteIndex = pendingDeleteRoleId
    ? draft.roles.findIndex((r) => r.localId === pendingDeleteRoleId)
    : -1;
  const pendingDeleteRole = pendingDeleteIndex >= 0 ? draft.roles[pendingDeleteIndex] : null;
  const pendingDeleteLabel =
    pendingDeleteIndex >= 0 ? editorRoleLabel(pendingDeleteIndex) : "";

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
    <div className="flex h-full min-h-0 flex-col bg-[var(--background)]">
      <ConfirmModal
        open={pendingDeleteRoleId !== null}
        title="역할 삭제"
        onClose={() => setPendingDeleteRoleId(null)}
        onConfirm={() => {
          if (!pendingDeleteRoleId) return;
          removeRole(pendingDeleteRoleId);
          setPendingDeleteRoleId(null);
        }}
      >
        <p>{pendingDeleteLabel}을(를) 삭제할까요?</p>
        <p>
          {pendingDeleteRole && roleHasContent(pendingDeleteRole)
            ? "작성 내용이 함께 삭제되며 되돌릴 수 없습니다."
            : "이 작업은 되돌릴 수 없습니다."}
        </p>
      </ConfirmModal>

      <RoleNav
        roles={draft.roles}
        activeRoleId={activeRoleId}
        canAddRole={canAddRole}
        canRemoveRole={canRemoveRole}
        onSelect={setActiveRoleId}
        onAdd={addRole}
        onRequestDelete={setPendingDeleteRoleId}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeRole ? (
          <div
            id={`role-panel-${activeRole.localId}`}
            role="tabpanel"
            aria-labelledby={`role-tab-${activeRole.localId}`}
            className="flex h-full min-h-0 flex-col"
          >
            <RoleContent
              role={activeRole}
              activityTitle={draft.title}
              onChange={(next) => updateRole(activeRole.localId, next)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
