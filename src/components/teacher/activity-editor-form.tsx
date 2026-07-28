"use client";

import { useState } from "react";
import { Check, CheckCircle2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmptyQuestion,
  createEmptyRole,
  editorQuestionLabel,
  editorRoleLabel,
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
import { cn } from "@/lib/utils";
import {
  activityEditorQuestionCard,
  activityEditorQuestionPanelBg,
  activityEditorSegmentFieldClass,
  activityEditorSegmentHeaderBorder,
  activityEditorSegmentPanelBg,
  playPhaseSectionShell,
} from "@/lib/theme/activity-layout-chrome";

type Props = {
  draft: ActivityEditorDraft;
  onChange: (draft: ActivityEditorDraft) => void;
};

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



function roleHasContent(role: EditorRole): boolean {
  if (role.segment.trim()) return true;
  return role.practiceQuestions.some((q) => q.prompt.trim());
}

function questionHasContent(question: EditorQuestion): boolean {
  if (question.prompt.trim()) return true;
  if (question.choices.some((c) => c.trim())) return true;
  return false;
}

function SingleQuestionEditor({
  question: q,
  qIdx,
  onUpdate,
  className,
}: {
  question: EditorQuestion;
  qIdx: number;
  onUpdate: (updater: (q: EditorQuestion) => EditorQuestion) => void;
  className?: string;
}) {
  const canAddChoice = q.choices.length < MAX_CHOICES_PER_QUESTION;
  const canRemoveChoice = q.choices.length > MIN_CHOICES_PER_QUESTION;

  return (
    <div className={cn("min-w-0 flex-1 space-y-3", className)}>
      <div className="flex items-start gap-2">
        <span className="mt-1.5 text-sm font-medium text-[var(--foreground)]">
          {qIdx + 1}.
        </span>

        <Textarea
          id={`q-prompt-${q.localId}`}
          value={q.prompt}
          onChange={(e) =>
            onUpdate((cur) => ({ ...cur, prompt: e.target.value }))
          }
          placeholder="발문을 입력하세요."
          aria-label={`${qIdx + 1}번 발문`}
          className="text-sm"
        />
      </div>

      <div className="space-y-1.5">
        {q.choices.map((choice, ci) => {
          const isCorrect = q.correctIndex === ci;
          const label = CHOICE_LABELS[ci] ?? ci + 1;

          return (
            <div key={ci} className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={isCorrect}
                aria-label={`${label}번 정답`}
                title={`${label}번 정답으로 설정`}
                onClick={() =>
                  onUpdate((cur) => ({ ...cur, correctIndex: ci }))
                }
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-[0.8rem] font-semibold transition-colors",
                  isCorrect
                    ? "border-[var(--primary)] bg-[var(--tint-primary-medium)] text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]",
                )}
              >
                {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : label}
              </button>

              <Textarea
                value={choice}
                onChange={(e) =>
                  onUpdate((cur) => ({
                    ...cur,
                    choices: cur.choices.map((c, i) =>
                      i === ci ? e.target.value : c,
                    ),
                  }))
                }
                placeholder="보기를 입력하세요."
                className="text-sm py-1.5"
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
            onClick={() =>
              onUpdate((cur) => ({ ...cur, choices: [...cur.choices, ""] }))
            }
          >
            <Plus className="h-3.5 w-3.5" />
            보기 추가
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  qIdx,
  canRemove,
  onUpdate,
  onDeleteRequest,
}: {
  question: EditorQuestion;
  qIdx: number;
  canRemove: boolean;
  onUpdate: (updater: (q: EditorQuestion) => EditorQuestion) => void;
  onDeleteRequest: () => void;
}) {
  return (
    <div
      className={cn(
        activityEditorQuestionCard,
        "p-4",
      )}
    >
      <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
        <h4 className="text-sm font-semibold text-[var(--foreground)]">
          문항 {qIdx + 1}
        </h4>

        <div className="flex items-center gap-1">
          {canRemove ? (
            <EditorDeleteButton
              label={`${qIdx + 1}번 문항 삭제`}
              onClick={onDeleteRequest}
              className="h-8 w-8"
            />
          ) : null}
        </div>
      </div>

      <SingleQuestionEditor
        question={question}
        qIdx={qIdx}
        onUpdate={onUpdate}
      />
    </div>
  );
}

function QuestionListEditor({
  questions,
  minCount = MIN_QUESTIONS_PER_ROLE,
  onChange,
}: {
  questions: EditorQuestion[];
  minCount?: number;
  onChange: (next: EditorQuestion[]) => void;
}) {
  const canRemove = questions.length > minCount;
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const pendingIndex = pendingDeleteId
    ? questions.findIndex((q) => q.localId === pendingDeleteId)
    : -1;

  const pendingQuestion = pendingIndex >= 0 ? questions[pendingIndex] : null;
  const pendingLabel =
    pendingIndex >= 0 ? editorQuestionLabel(pendingIndex) : "";

  const updateQuestion = (
    localId: string,
    updater: (q: EditorQuestion) => EditorQuestion,
  ) => {
    onChange(questions.map((q) => (q.localId === localId ? updater(q) : q)));
  };

  const addQuestion = () => {
    const question = createEmptyQuestion();
    onChange([...questions, question]);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return;

    const next = questions.filter((q) => q.localId !== pendingDeleteId);
    onChange(next);
    setPendingDeleteId(null);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {questions.map((q, qIdx) => (
          <QuestionCard
            key={q.localId}
            question={q}
            qIdx={qIdx}
            canRemove={canRemove}
            onUpdate={(updater) => updateQuestion(q.localId, updater)}
            onDeleteRequest={() => setPendingDeleteId(q.localId)}
          />
        ))}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full gap-1.5 text-sm"
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



const EDITOR_STEPS = [
  { key: "expert", number: 1, title: "전문가 학습 내용" },
  { key: "test", number: 2, title: "실전 문제 (개별 형성평가)" },
] as const;

function EditorPhaseStepper({
  currentPhase,
  onChange,
}: {
  currentPhase: "expert" | "test";
  onChange: (phase: "expert" | "test") => void;
}) {
  return (
    <nav
      aria-label="편집 단계"
      className="w-full bg-[var(--card-bg)] py-3 px-4 sm:px-6 border-b border-[var(--border)]"
    >
      <ol className="mx-auto flex max-w-5xl px-4 items-center justify-start gap-4">
        {EDITOR_STEPS.map((step, index) => {
          const isCurrent = currentPhase === step.key;
          const isComplete = currentPhase === "test" && step.key === "expert";
          const state = isCurrent ? "current" : isComplete ? "complete" : "upcoming";
          const isLast = index === EDITOR_STEPS.length - 1;

          return (
            <li
              key={step.key}
              className={cn(
                "flex items-center",
                isLast ? "shrink-0" : "flex-1 max-w-[300px]"
              )}
            >
              <button
                type="button"
                onClick={() => onChange(step.key as "expert" | "test")}
                className="flex shrink-0 items-center gap-2 text-left animate-fade-in"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 font-semibold tabular-nums transition-colors text-[0.8rem]",
                    state === "current" &&
                    "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)] shadow-sm",
                    state === "complete" &&
                    "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_12%,var(--card-bg))] text-[var(--primary)]",
                    state === "upcoming" &&
                    "border-[var(--border)] bg-[var(--surface-overlay)] text-[var(--muted-foreground)]",
                  )}
                >
                  {state === "complete" ? <Check className="h-4 w-4" /> : step.number}
                </span>

                <span
                  className={cn(
                    "whitespace-nowrap font-semibold text-sm sm:text-base",
                    state === "current"
                      ? "text-[var(--primary)]"
                      : state === "complete"
                        ? "text-[var(--foreground)]"
                        : "text-[var(--muted-foreground)]",
                  )}
                >
                  {step.title}
                </span>
              </button>

              {!isLast ? (
                <div
                  className={cn(
                    "ml-4 h-0.5 flex-1 rounded-full transition-colors",
                    currentPhase === "test"
                      ? "bg-[var(--primary)]"
                      : "bg-[color-mix(in_srgb,var(--muted)_40%,var(--border))]"
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function RoleChipNav({
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
  return (
    <nav
      className="flex shrink-0 bg-[var(--background)] py-3 border-b border-[var(--border)]"
      aria-label="학습 내용 선택"
    >
      <div
        className="mx-auto flex w-full max-w-5xl items-center justify-start gap-2 px-3 sm:px-4 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        {roles.map((role, rIdx) => {
          const isActive = role.localId === activeRoleId;
          const label = editorRoleLabel(rIdx);
          const done = roleHasContent(role);

          return (
            <button
              key={role.localId}
              type="button"
              role="tab"
              aria-selected={isActive}
              id={`role-tab-${role.localId}`}
              aria-controls={`role-panel-${role.localId}`}
              onClick={() => onSelect(role.localId)}
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
              <span className="whitespace-nowrap">{label}</span>

              {canRemoveRole && isActive ? (
                <span
                  role="button"
                  aria-label={`${label} 삭제`}
                  title={`${label} 삭제`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestDelete(role.localId);
                  }}
                  className="ml-1 rounded-full p-0.5 hover:bg-[color-mix(in_srgb,var(--danger)_30%,var(--primary))] text-[var(--on-primary)] hover:text-white"
                >
                  <Trash2 className="h-3 w-3" />
                </span>
              ) : null}
            </button>
          );
        })}

        {canAddRole ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onAdd}
            aria-label="추가"
            className="h-8 w-8 shrink-0 rounded-full border border-dashed border-[var(--border)] text-[var(--primary)] hover:bg-[var(--tint-primary-weak)] hover:text-[var(--primary)]"
          >
            <Plus className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </nav>
  );
}

export function ActivityEditorForm({ draft, onChange }: Props) {
  const [editorPhase, setEditorPhase] = useState<"expert" | "test">("expert");
  const [activeRoleId, setActiveRoleId] = useState(
    draft.roles[0]?.localId ?? "",
  );
  const [pendingDeleteRoleId, setPendingDeleteRoleId] = useState<string | null>(
    null,
  );

  const canAddRole = draft.roles.length < MAX_ROLES_PER_GROUP;
  const canRemoveRole = draft.roles.length > MIN_ROLES_PER_GROUP;

  const activeRoleIdResolved = draft.roles.some((r) => r.localId === activeRoleId)
    ? activeRoleId
    : (draft.roles[0]?.localId ?? "");

  const activeIndex = draft.roles.findIndex((r) => r.localId === activeRoleIdResolved);
  const activeRole = activeIndex >= 0 ? draft.roles[activeIndex] : draft.roles[0];

  const pendingDeleteIndex = pendingDeleteRoleId
    ? draft.roles.findIndex((r) => r.localId === pendingDeleteRoleId)
    : -1;

  const pendingDeleteRole =
    pendingDeleteIndex >= 0 ? draft.roles[pendingDeleteIndex] : null;

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

    onChange({
      ...draft,
      roles: [...draft.roles, role],
    });

    setActiveRoleId(role.localId);
  };

  const removeRole = (localId: string) => {
    const nextRoles = draft.roles.filter((r) => r.localId !== localId);

    onChange({
      ...draft,
      roles: nextRoles,
    });

    if (activeRoleId === localId) {
      setActiveRoleId(nextRoles[0]?.localId ?? "");
    }
  };

  const updateTestQuestions = (nextQuestions: EditorQuestion[]) => {
    onChange({
      ...draft,
      testQuestions: nextQuestions,
    });
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

      <EditorPhaseStepper
        currentPhase={editorPhase}
        onChange={setEditorPhase}
      />

      {editorPhase === "expert" ? (
        <>
          <RoleChipNav
            roles={draft.roles}
            activeRoleId={activeRoleIdResolved}
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
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="mx-auto w-full max-w-5xl p-3 sm:p-4 animate-fade-in">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <section
                        className={cn(
                          playPhaseSectionShell,
                          "flex flex-col",
                          activityEditorSegmentPanelBg,
                          "min-w-0 flex-1 basis-1/2",
                        )}
                      >
                        <div
                          className={cn(
                            "flex shrink-0 items-center justify-between border-b px-4 py-3",
                            activityEditorSegmentHeaderBorder,
                          )}
                        >
                          <div>
                            <h3 className="text-sm font-semibold text-[var(--foreground)]">
                              {editorRoleLabel(activeIndex)}
                            </h3>
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                              전문가 집단에서 학습할 내용입니다.
                            </p>
                          </div>
                        </div>

                        <div className="px-4 py-4">
                          <Textarea
                            id={`segment-${activeRole.localId}`}
                            value={activeRole.segment}
                            onChange={(e) =>
                              updateRole(activeRole.localId, {
                                ...activeRole,
                                segment: e.target.value,
                              })
                            }
                            placeholder="학습 내용을 입력하세요."
                            aria-label="학습 내용"
                            rows={10}
                            className={cn(
                              activityEditorSegmentFieldClass,
                              "text-sm leading-relaxed",
                            )}
                          />
                        </div>
                      </section>

                      <section
                        className={cn(
                          playPhaseSectionShell,
                          "flex flex-col",
                          activityEditorQuestionPanelBg,
                          "min-w-0 flex-1 basis-1/2",
                        )}
                      >
                        <div
                          className={cn(
                            "flex shrink-0 items-center justify-between border-b px-4 py-3",
                            activityEditorSegmentHeaderBorder,
                          )}
                        >
                          <div>
                            <h3 className="text-sm font-semibold text-[var(--foreground)]">
                              연습 문제
                            </h3>
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                              전문가 집단에서 학습할 연습 문제입니다.
                            </p>
                          </div>
                        </div>

                        <div className="px-4 py-4">
                          <QuestionListEditor
                            key={`practice-${activeRole.localId}`}
                            questions={activeRole.practiceQuestions}
                            minCount={MIN_QUESTIONS_PER_ROLE}
                            onChange={(next) =>
                              updateRole(activeRole.localId, {
                                ...activeRole,
                                practiceQuestions: next,
                              })
                            }
                          />
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl p-3 sm:p-4 animate-fade-in">
            <div className="flex items-start gap-3 sm:gap-4">
              <section
                className={cn(
                  playPhaseSectionShell,
                  "flex flex-col",
                  activityEditorSegmentPanelBg,
                  "min-w-0 flex-1 basis-1/2",
                )}
              >
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-between border-b px-4 py-3",
                    activityEditorSegmentHeaderBorder,
                  )}
                >
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">
                      학습 내용 모음
                    </h3>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      앞 단계에서 입력한 학습 내용들입니다.
                    </p>
                  </div>
                </div>

                <div className="px-4 py-4 space-y-6">
                  {draft.roles.map((role, rIdx) => {
                    const label = editorRoleLabel(rIdx);
                    return (
                      <div
                        key={role.localId}
                        className={cn(
                          rIdx > 0 && "border-t border-[var(--border)] pt-4"
                        )}
                      >
                        <h4 className="text-xs font-bold text-[var(--primary)] mb-2">
                          {label}
                        </h4>
                        <p className="whitespace-pre-wrap break-keep break-words text-sm text-[var(--foreground)] bg-[var(--surface-overlay)] p-3 rounded-md border border-[var(--border)]">
                          {role.segment.trim() || "(입력된 내용이 없습니다)"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section
                className={cn(
                  playPhaseSectionShell,
                  "flex flex-col",
                  activityEditorQuestionPanelBg,
                  "min-w-0 flex-1 basis-1/2",
                )}
              >
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-between border-b px-4 py-3",
                    activityEditorSegmentHeaderBorder,
                  )}
                >
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">
                      실전 문제
                    </h3>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      마지막에 개별적으로 풀 실전 문제입니다.
                    </p>
                  </div>
                </div>

                <div className="px-4 py-4">
                  <QuestionListEditor
                    key="test-all"
                    questions={draft.testQuestions}
                    minCount={1}
                    onChange={updateTestQuestions}
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}