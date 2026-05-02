"use client";

import {
  StepHeading,
  StepListItemCard,
  StepListRemoveButton,
} from "./step-blocks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SuspectEntry } from "@/lib/suspects";
import { Plus } from "lucide-react";

type Props = {
  suspects: SuspectEntry[];
  answerSuspectId: string;
  newSuspectId: () => string;
  onChangeSuspects: (value: SuspectEntry[]) => void;
  onChangeAnswerSuspectId: (id: string) => void;
};

function updateSuspectAt(
  list: SuspectEntry[],
  id: string,
  patch: Partial<Pick<SuspectEntry, "name" | "detail">>,
): SuspectEntry[] {
  return list.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

export function SuspectsStep({
  suspects,
  answerSuspectId,
  newSuspectId,
  onChangeSuspects,
  onChangeAnswerSuspectId,
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
        <StepHeading
          step={2}
          title="용의자 프로필"
          subtitle="사건 파악 단계에 공개되는 용의자 목록을 등록하고, 범인(정답) 한 명을 지정합니다."
        />
      </CardHeader>
      <CardContent className="space-y-5">
        <ul className="space-y-5">
          {suspects.map((s, index) => (
            <StepListItemCard key={s.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--mystery)]">
                  용의자 {index + 1}
                </p>
                <StepListRemoveButton
                  onClick={() => removeSuspect(s.id)}
                  disabled={suspects.length === 1}
                />
              </div>
              <div className="mt-3 space-y-1.5">
                <label className="text-xs font-medium text-[var(--accent)]">
                  이름<span className="ml-0.5 text-[var(--danger)]">*</span>
                </label>
                <Input
                  value={s.name}
                  onChange={(e) => onChangeSuspects(updateSuspectAt(suspects, s.id, { name: e.target.value }))}
                  placeholder="이름 (예: 김OO)"
                />
                <label className="text-xs font-medium text-[var(--accent)]">
                  프로필<span className="ml-0.5 text-[var(--danger)]">*</span>
                </label>
                <Textarea
                  value={s.detail}
                  onChange={(e) =>
                    onChangeSuspects(updateSuspectAt(suspects, s.id, { detail: e.target.value }))
                  }
                  placeholder="알리바이·특징 등"
                  rows={2}
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
            </StepListItemCard>
          ))}
        </ul>
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={addSuspect} className="gap-1">
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            용의자 추가
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
