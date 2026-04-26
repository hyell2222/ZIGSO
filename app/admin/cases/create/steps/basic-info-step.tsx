"use client";

import {
  WizardListItemCard,
  WizardListSection,
  WizardRowRemoveButton,
} from "@/components/admin/wizard-list-section";
import { WizardStepHint } from "@/components/admin/wizard-step-hint";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SuspectEntry } from "@/lib/suspects";

const DIFFICULTIES = ["Easy", "Normal", "Hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

type Props = {
  title: string;
  description: string;
  suspects: SuspectEntry[];
  answerSuspectId: string;
  difficulty: Difficulty;
  newSuspectId: () => string;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeSuspects: (value: SuspectEntry[]) => void;
  onChangeAnswerSuspectId: (id: string) => void;
  onChangeDifficulty: (value: Difficulty) => void;
};

function updateSuspectAt(
  list: SuspectEntry[],
  id: string,
  patch: Partial<Pick<SuspectEntry, "name" | "detail">>,
): SuspectEntry[] {
  return list.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

export function BasicInfoStep({
  title,
  description,
  suspects,
  answerSuspectId,
  difficulty,
  newSuspectId,
  onChangeTitle,
  onChangeDescription,
  onChangeSuspects,
  onChangeAnswerSuspectId,
  onChangeDifficulty,
}: Props) {
  const addSuspect = () => {
    onChangeSuspects([...suspects, { id: newSuspectId(), name: "", detail: "" }]);
  };

  const removeSuspect = (id: string) => {
    const next = suspects.filter((s) => s.id !== id);
    onChangeSuspects(
      next.length > 0 ? next : [{ id: newSuspectId(), name: "", detail: "" }],
    );
    if (answerSuspectId === id) onChangeAnswerSuspectId("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. 사건 기본 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <WizardStepHint>
          게임은 <strong>브리핑(부원증·사건·용의자) → 구역 조사 → 최종 보고서</strong> 세 단계로 진행됩니다. 최종
          보고서에서<strong> 범인은 아래 용의자 중에서만 </strong>고릅니다.
        </WizardStepHint>
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--accent)]">
            제목<span className="ml-0.5 text-red-400">*</span>
          </label>
          <Input
            value={title}
            onChange={(event) => onChangeTitle(event.target.value)}
            placeholder="예) 음악준비실에서 사라진 소품"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--accent)]">
            사건 개요 (브리핑에 공개)<span className="ml-0.5 text-red-400">*</span>
          </label>
          <Textarea
            value={description}
            onChange={(event) => onChangeDescription(event.target.value)}
            placeholder="의뢰 내용, 알려진 사실, 학생들이 알아야 할 배경"
            rows={5}
          />
        </div>

        <WizardListSection
          title={
            <span>
              용의자<span className="ml-0.5 text-red-400">*</span>
            </span>
          }
          description="이름(필수)과 부가 설명(선택). 브리핑에 그대로 공개됩니다."
          onAdd={addSuspect}
        >
          {suspects.map((s, index) => (
            <WizardListItemCard key={s.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--mystery)]">
                  용의자 {index + 1}
                </p>
                <WizardRowRemoveButton
                  onClick={() => removeSuspect(s.id)}
                  disabled={suspects.length === 1}
                />
              </div>
              <div className="mt-3 space-y-1.5">
                <Input
                  value={s.name}
                  onChange={(e) => onChangeSuspects(updateSuspectAt(suspects, s.id, { name: e.target.value }))}
                  placeholder="이름 (예: 김OO)"
                />
                <Textarea
                  value={s.detail}
                  onChange={(e) => onChangeSuspects(updateSuspectAt(suspects, s.id, { detail: e.target.value }))}
                  placeholder="알리바이·특징 등 (선택)"
                  rows={2}
                  className="text-xs"
                />
              </div>
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-[var(--foreground)]">
                <input
                  type="radio"
                  name="answer-suspect"
                  checked={answerSuspectId === s.id}
                  onChange={() => onChangeAnswerSuspectId(s.id)}
                  className="accent-[var(--accent)]"
                />
                <span>
                  이 인물이 사건의 <strong>범인(정답)</strong>이다
                </span>
              </label>
            </WizardListItemCard>
          ))}
        </WizardListSection>

        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--accent)]">난이도</label>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => {
              const active = difficulty === d;
              return (
                <Button
                  key={d}
                  type="button"
                  variant="tab"
                  onClick={() => onChangeDifficulty(d)}
                  className={
                    "rounded-md border px-3 py-1.5 text-sm transition-colors " +
                    (active
                      ? "border-[var(--accent)] bg-[var(--tint-accent-strong)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--tint-mystery)]")
                  }
                >
                  {d}
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
