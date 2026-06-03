"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmptyQuestion,
  createEmptyRole,
  editorQuestionLabel,
  editorRoleLabel,
  MAX_CHOICES_PER_QUESTION,
  MAX_ROLES_PER_GROUP,
  MIN_CHOICES_PER_QUESTION,
  MIN_QUESTIONS_PER_ROLE,
  MIN_ROLES_PER_GROUP,
  type EditorQuestion,
  type EditorRole,
  type ActivityEditorDraft,
  type EditorStepId,
} from "@/lib/activity-pack/activity-draft";
import { cn } from "@/lib/utils";

type Props = {
  draft: ActivityEditorDraft;
  onChange: (draft: ActivityEditorDraft) => void;
  step: EditorStepId;
};

const inputBaseClass = "h-9 text-sm w-full";
const CHOICE_LABELS = ["A", "B", "C", "D", "E", "F"];

function CollapsibleBlock({
  title,
  subtitle,
  defaultOpen = true,
  optional = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-[var(--border)] bg-[var(--card-bg)]"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform group-open:rotate-180" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {title}
            {optional ? (
              <span className="ml-1.5 text-xs font-normal text-[var(--muted-foreground)]">
                (선택)
              </span>
            ) : null}
          </p>
          {subtitle ? (
            <p className="text-[11px] leading-snug text-[var(--muted-foreground)]">{subtitle}</p>
          ) : null}
        </div>
      </summary>
      <div className="space-y-3 border-t border-[var(--border)] px-3 py-3">{children}</div>
    </details>
  );
}

function RolesStepEditor({
  draft,
  onChange,
}: {
  draft: ActivityEditorDraft;
  onChange: (draft: ActivityEditorDraft) => void;
}) {
  const [activeRoleId, setActiveRoleId] = useState(draft.roles[0]?.localId ?? "");

  useEffect(() => {
    if (!draft.roles.some((r) => r.localId === activeRoleId)) {
      setActiveRoleId(draft.roles[0]?.localId ?? "");
    }
  }, [draft.roles, activeRoleId]);

  const canAddRole = draft.roles.length < MAX_ROLES_PER_GROUP;
  const canRemoveRole = draft.roles.length > MIN_ROLES_PER_GROUP;
  const activeRole = draft.roles.find((r) => r.localId === activeRoleId) ?? draft.roles[0];
  const activeIndex = draft.roles.findIndex((r) => r.localId === activeRole?.localId);

  const updateRole = (localId: string, updater: (role: EditorRole) => EditorRole) => {
    onChange({
      ...draft,
      roles: draft.roles.map((r) => (r.localId === localId ? updater(r) : r)),
    });
  };

  if (!activeRole || activeIndex < 0) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">역할을 추가해 주세요.</p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[var(--muted-foreground)] sm:text-sm">
          역할을 선택해 지문·문항을 편집합니다. 모둠 인원({draft.roles.length}명)과 역할 수가 같습니다.
        </p>
        {canAddRole ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const role = createEmptyRole();
              onChange({ ...draft, roles: [...draft.roles, role] });
              setActiveRoleId(role.localId);
            }}
            className="shrink-0 gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> 역할 추가
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <nav
          className="flex gap-1.5 overflow-x-auto pb-0.5 lg:w-36 lg:shrink-0 lg:flex-col lg:overflow-visible"
          aria-label="역할 선택"
        >
          {draft.roles.map((role, rIdx) => {
            const isActive = role.localId === activeRole.localId;
            return (
              <button
                key={role.localId}
                type="button"
                onClick={() => setActiveRoleId(role.localId)}
                className={cn(
                  "shrink-0 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors lg:w-full",
                  isActive
                    ? "border-[var(--primary)] bg-[var(--tint-accent-strong)] text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--muted-foreground)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]",
                )}
              >
                {editorRoleLabel(rIdx)}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1 space-y-2.5 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_40%,var(--card-bg))] p-3 shadow-xs sm:p-4">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
            <h3 className="text-sm font-bold text-[var(--foreground)]">
              {editorRoleLabel(activeIndex)}
            </h3>
            {canRemoveRole ? (
              <button
                type="button"
                onClick={() => {
                  const nextRoles = draft.roles.filter((r) => r.localId !== activeRole.localId);
                  onChange({ ...draft, roles: nextRoles });
                  setActiveRoleId(nextRoles[0]?.localId ?? "");
                }}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--muted-foreground)] hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] hover:text-[var(--danger)]"
              >
                <Trash2 className="h-3.5 w-3.5" /> 삭제
              </button>
            ) : null}
          </div>

          <CollapsibleBlock
            title="지문"
            subtitle="전문가·홈 집단에서 다룰 내용"
            defaultOpen
          >
            <FormField label="지문 조각" htmlFor={`role-segment-${activeRole.localId}`}>
              <Textarea
                id={`role-segment-${activeRole.localId}`}
                rows={5}
                value={activeRole.segment}
                onChange={(e) =>
                  updateRole(activeRole.localId, (r) => ({ ...r, segment: e.target.value }))
                }
                className="max-h-48 min-h-[7rem] resize-y text-sm"
              />
            </FormField>
            <FormField
              label="핵심 포인트 (선택)"
              htmlFor={`role-keypoints-${activeRole.localId}`}
              help="한 줄에 하나씩 입력하세요."
            >
              <Textarea
                id={`role-keypoints-${activeRole.localId}`}
                rows={3}
                value={activeRole.keyPoints}
                onChange={(e) =>
                  updateRole(activeRole.localId, (r) => ({ ...r, keyPoints: e.target.value }))
                }
                className="max-h-32 resize-y text-sm"
              />
            </FormField>
          </CollapsibleBlock>

          <CollapsibleBlock
            title="연습 문제"
            subtitle="3회 기회·힌트 · 평균이 기준 점수"
            defaultOpen
          >
            <QuestionListEditor
              questions={activeRole.practiceQuestions}
              withScaffold
              onChange={(next) =>
                updateRole(activeRole.localId, (r) => ({ ...r, practiceQuestions: next }))
              }
            />
          </CollapsibleBlock>

          <CollapsibleBlock
            title="실전 문제"
            subtitle="1회 응시 · 형성평가에 포함"
            defaultOpen={false}
          >
            <QuestionListEditor
              questions={activeRole.testQuestions}
              onChange={(next) =>
                updateRole(activeRole.localId, (r) => ({ ...r, testQuestions: next }))
              }
            />
          </CollapsibleBlock>
        </div>
      </div>
    </div>
  );
}

export function ActivityEditorForm({ draft, onChange, step }: Props) {
  if (step === "basics") {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <p className="text-xs leading-relaxed text-[var(--muted-foreground)] sm:text-sm">
          수업 주제와 활동 안내를 정합니다. 학생이 처음 보는 화면과 전체 학습 흐름의 기준이 됩니다.
        </p>
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xs">
          <FormField label="활동 제목" htmlFor="activity-title">
            <Input
              id="activity-title"
              value={draft.title}
              onChange={(e) => onChange({ ...draft, title: e.target.value })}
              placeholder="예: 직소 예시 — 세 가지 이야기"
              className={inputBaseClass}
            />
          </FormField>
          <FormField label="활동 안내" htmlFor="activity-desc">
            <Textarea
              id="activity-desc"
              rows={5}
              value={draft.description}
              onChange={(e) => onChange({ ...draft, description: e.target.value })}
              placeholder="학습 목표와 활동 상황을 간단히 적어 주세요."
              className="max-h-40 resize-y text-sm"
            />
          </FormField>
        </div>
      </div>
    );
  }

  return <RolesStepEditor draft={draft} onChange={onChange} />;
}

function questionSummary(prompt: string): string {
  const t = prompt.trim();
  if (!t) return "문항 내용 없음";
  return t.length > 36 ? `${t.slice(0, 36)}…` : t;
}

function QuestionListEditor({
  questions,
  withScaffold = false,
  onChange,
}: {
  questions: EditorQuestion[];
  withScaffold?: boolean;
  onChange: (next: EditorQuestion[]) => void;
}) {
  const canRemove = questions.length > MIN_QUESTIONS_PER_ROLE;

  const updateQuestion = (localId: string, updater: (q: EditorQuestion) => EditorQuestion) => {
    onChange(questions.map((q) => (q.localId === localId ? updater(q) : q)));
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1 text-xs"
        onClick={() => onChange([...questions, createEmptyQuestion()])}
      >
        <Plus className="h-3.5 w-3.5" /> 문항 추가
      </Button>

      {questions.map((q, qIdx) => (
        <details
          key={q.localId}
          open={qIdx === 0}
          className="group rounded-md border border-[var(--border)] bg-[var(--background)]"
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-2 [&::-webkit-details-marker]:hidden">
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)] transition-transform group-open:rotate-180" />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--foreground)]">
              {editorQuestionLabel(qIdx)} · {questionSummary(q.prompt)}
            </span>
            {canRemove ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onChange(questions.filter((item) => item.localId !== q.localId));
                }}
                className="shrink-0 rounded p-1 text-[var(--muted-foreground)] hover:text-[var(--danger)]"
                title="문항 삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </summary>
          <div className="space-y-2.5 border-t border-[var(--border)] px-2.5 py-2.5">
            <SingleQuestionEditor
              question={q}
              withScaffold={withScaffold}
              onUpdate={(updater) => updateQuestion(q.localId, updater)}
            />
          </div>
        </details>
      ))}
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

  return (
    <>
      <FormField label="문제" htmlFor={`q-prompt-${q.localId}`}>
        <Textarea
          id={`q-prompt-${q.localId}`}
          rows={2}
          value={q.prompt}
          onChange={(e) => onUpdate((cur) => ({ ...cur, prompt: e.target.value }))}
          className="min-h-[3rem] resize-y text-sm"
        />
      </FormField>
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-[var(--foreground)]">보기 · 정답 선택</p>
        {q.choices.map((choice, ci) => {
          const isCorrect = q.correctIndex === ci;
          return (
            <div key={ci} className="flex items-center gap-1.5">
              <button
                type="button"
                aria-pressed={isCorrect}
                onClick={() => onUpdate((cur) => ({ ...cur, correctIndex: ci }))}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                  isCorrect
                    ? "border-[var(--primary)] bg-[var(--tint-accent-strong)] text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)]",
                )}
              >
                {isCorrect ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
              </button>
              <span className="w-4 text-center text-[11px] font-semibold text-[var(--muted-foreground)]">
                {CHOICE_LABELS[ci] ?? ci + 1}
              </span>
              <Input
                value={choice}
                onChange={(e) => {
                  const text = e.target.value;
                  onUpdate((cur) => ({
                    ...cur,
                    choices: cur.choices.map((c, i) => (i === ci ? text : c)),
                  }));
                }}
                className={inputBaseClass}
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
                  className="shrink-0 p-1 text-[var(--muted-foreground)] hover:text-[var(--danger)]"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          );
        })}
        {canAddChoice ? (
          <button
            type="button"
            onClick={() => onUpdate((cur) => ({ ...cur, choices: [...cur.choices, ""] }))}
            className="text-xs font-semibold text-[var(--primary)]"
          >
            + 보기
          </button>
        ) : null}
      </div>
      {withScaffold ? (
        <details className="rounded-md border border-dashed border-[var(--border)] px-2.5 py-1">
          <summary className="cursor-pointer py-1.5 text-xs font-semibold text-[var(--muted-foreground)]">
            힌트·해설 (선택)
          </summary>
          <div className="space-y-2 pb-2">
            <FormField label="오답 힌트" help="한 줄에 하나">
              <Textarea
                rows={2}
                value={q.hints}
                onChange={(e) => onUpdate((cur) => ({ ...cur, hints: e.target.value }))}
                className="resize-y text-sm"
              />
            </FormField>
            <FormField label="해설">
              <Textarea
                rows={2}
                value={q.explanation}
                onChange={(e) => onUpdate((cur) => ({ ...cur, explanation: e.target.value }))}
                className="resize-y text-sm"
              />
            </FormField>
          </div>
        </details>
      ) : null}
    </>
  );
}
