"use client";

import { Plus, Trash2, Folder, CheckCircle2, Circle } from "lucide-react";

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

const inputBaseClass = "h-10 text-sm w-full";
const CHOICE_LABELS = ["A", "B", "C", "D", "E", "F"];

export function ActivityEditorForm({ draft, onChange, step }: Props) {
  if (step === "basics") {
    return (
      <div className="max-w-2xl mx-auto w-full space-y-4">
        <p className="text-xs text-center sm:text-left sm:text-sm leading-relaxed text-[var(--muted-foreground)]">
          수업 주제와 활동 안내를 정합니다. 학생이 처음 보는 화면과 전체 학습 흐름의 기준이 됩니다.
        </p>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xs space-y-4">
          <FormField label="활동 제목" htmlFor="activity-title">
            <Input
              id="activity-title"
              value={draft.title}
              onChange={(e) => onChange({ ...draft, title: e.target.value })}
              placeholder="예: 교과서 본문: Save Our Planet"
              className={inputBaseClass}
            />
          </FormField>
          <FormField label="활동 안내" htmlFor="activity-desc">
            <Textarea
              id="activity-desc"
              rows={6}
              value={draft.description}
              onChange={(e) => onChange({ ...draft, description: e.target.value })}
              placeholder="학습 목표와 활동 상황을 간단히 적어 주세요."
              className="text-sm"
            />
          </FormField>
        </div>
      </div>
    );
  }

  const canAddRole = draft.roles.length < MAX_ROLES_PER_GROUP;
  const canRemoveRole = draft.roles.length > MIN_ROLES_PER_GROUP;

  const updateRole = (localId: string, updater: (role: EditorRole) => EditorRole) => {
    onChange({
      ...draft,
      roles: draft.roles.map((r) => (r.localId === localId ? updater(r) : r)),
    });
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">
          역할마다 지문, 연습 문제(여러 개·3회 기회), 실전 문제(여러 개·1회 응시)를 작성합니다.
        </p>
        {canAddRole && (
          <Button
            size="sm"
            onClick={() => onChange({ ...draft, roles: [...draft.roles, createEmptyRole()] })}
            className="gap-1 font-semibold text-xs shrink-0"
          >
            <Plus className="h-3.5 w-3.5" /> 역할 추가
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {draft.roles.map((role, rIdx) => (
          <div
            key={role.localId}
            className="rounded-2xl border-2 border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--background)_30%,var(--card-bg))] p-4 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
                  <Folder className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-[var(--foreground)]">
                  {editorRoleLabel(rIdx)}
                </span>
              </div>
              {canRemoveRole && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...draft,
                      roles: draft.roles.filter((r) => r.localId !== role.localId),
                    })
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]"
                  title="역할 삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <FormField
              label="지문 조각 · 풀이 방식"
              htmlFor={`role-segment-${role.localId}`}
              help="전문가 집단에서 이 역할 학생이 공부하고, 홈 집단에서 설명할 내용입니다."
            >
              <Textarea
                id={`role-segment-${role.localId}`}
                rows={4}
                value={role.segment}
                onChange={(e) =>
                  updateRole(role.localId, (r) => ({ ...r, segment: e.target.value }))
                }
                placeholder="예: Part 1 — 도입: 환경은 우리를 둘러싼 모든 것…"
                className="text-sm"
              />
            </FormField>

            <FormField
              label="핵심 포인트 (선택)"
              htmlFor={`role-keypoints-${role.localId}`}
              help="한 줄에 하나씩 입력하세요."
            >
              <Textarea
                id={`role-keypoints-${role.localId}`}
                rows={3}
                value={role.keyPoints}
                onChange={(e) =>
                  updateRole(role.localId, (r) => ({ ...r, keyPoints: e.target.value }))
                }
                placeholder={"환경 = 공기·물·땅·생물\n건강한 환경이 우리를 안전하게 함"}
                className="text-sm"
              />
            </FormField>

            <QuestionListEditor
              title="연습 문제 (전문가 집단)"
              hint="문항마다 3회 기회·힌트. 문항 점수의 평균이 기준 점수가 됩니다."
              questions={role.practiceQuestions}
              withScaffold
              onChange={(next) =>
                updateRole(role.localId, (r) => ({ ...r, practiceQuestions: next }))
              }
            />

            <QuestionListEditor
              title="실전 문제 (개별 형성평가)"
              hint="1회만 응시. 모든 역할의 실전 문항이 형성평가에 포함됩니다."
              questions={role.testQuestions}
              onChange={(next) => updateRole(role.localId, (r) => ({ ...r, testQuestions: next }))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionListEditor({
  title,
  hint,
  questions,
  withScaffold = false,
  onChange,
}: {
  title: string;
  hint: string;
  questions: EditorQuestion[];
  withScaffold?: boolean;
  onChange: (next: EditorQuestion[]) => void;
}) {
  const canRemove = questions.length > MIN_QUESTIONS_PER_ROLE;

  const updateQuestion = (localId: string, updater: (q: EditorQuestion) => EditorQuestion) => {
    onChange(questions.map((q) => (q.localId === localId ? updater(q) : q)));
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-[var(--foreground)]">{title}</p>
          <p className="text-[11px] text-[var(--muted-foreground)]">{hint}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1 text-xs shrink-0"
          onClick={() => onChange([...questions, createEmptyQuestion()])}
        >
          <Plus className="h-3.5 w-3.5" /> 문항 추가
        </Button>
      </div>

      {questions.map((q, qIdx) => (
        <div
          key={q.localId}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{editorQuestionLabel(qIdx)}</span>
            {canRemove && (
              <button
                type="button"
                onClick={() => onChange(questions.filter((item) => item.localId !== q.localId))}
                className="text-[var(--muted-foreground)] hover:text-[var(--danger)]"
                title="문항 삭제"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <SingleQuestionEditor
            question={q}
            withScaffold={withScaffold}
            onUpdate={(updater) => updateQuestion(q.localId, updater)}
          />
        </div>
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
          className="text-sm"
        />
      </FormField>
      <div className="space-y-2">
        <p className="text-xs font-bold">보기 (정답 클릭)</p>
        {q.choices.map((choice, ci) => {
          const isCorrect = q.correctIndex === ci;
          return (
            <div key={ci} className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={isCorrect}
                onClick={() => onUpdate((cur) => ({ ...cur, correctIndex: ci }))}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
                  isCorrect
                    ? "border-[var(--primary)] bg-[var(--tint-accent-strong)] text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)]",
                )}
              >
                {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              </button>
              <span className="w-5 text-center text-xs font-semibold text-[var(--muted-foreground)]">
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
              {canRemoveChoice && (
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
              )}
            </div>
          );
        })}
        {canAddChoice && (
          <button
            type="button"
            onClick={() => onUpdate((cur) => ({ ...cur, choices: [...cur.choices, ""] }))}
            className="text-xs font-bold text-[var(--primary)]"
          >
            + 보기 추가
          </button>
        )}
      </div>
      {withScaffold ? (
        <>
          <FormField label="오답 힌트 (선택)" help="한 줄에 하나. 1·2번째 오답 시 순서대로 표시.">
            <Textarea
              rows={2}
              value={q.hints}
              onChange={(e) => onUpdate((cur) => ({ ...cur, hints: e.target.value }))}
              className="text-sm"
            />
          </FormField>
          <FormField label="해설 (선택)">
            <Textarea
              rows={2}
              value={q.explanation}
              onChange={(e) => onUpdate((cur) => ({ ...cur, explanation: e.target.value }))}
              className="text-sm"
            />
          </FormField>
        </>
      ) : null}
    </>
  );
}
