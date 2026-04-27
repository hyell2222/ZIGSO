"use client";

import {
  WizardListItemCard,
  WizardListSection,
  WizardRowRemoveButton,
  WizardStepHint,
} from "@/components/admin/wizard-list-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SuspectEntry } from "@/lib/suspects";

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
        <CardTitle>2. 용의자 프로필</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <WizardStepHint>
          브리핑에 그대로 공개되는 인물 목록입니다. 최종 보고서에서는{" "}
          <strong>여기서 등록한 용의자 중에서만</strong> 범인을 고를 수 있습니다. 반드시 한 명을{" "}
          <strong>범인(정답)</strong>으로 지정하세요.
        </WizardStepHint>

        <WizardListSection
          title={
            <span>
              용의자<span className="ml-0.5 text-[var(--danger)]">*</span>
            </span>
          }
          description="이름(필수)과 부가 설명(선택)."
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
                  onChange={(e) =>
                    onChangeSuspects(updateSuspectAt(suspects, s.id, { detail: e.target.value }))
                  }
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
      </CardContent>
    </Card>
  );
}
