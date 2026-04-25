"use client";

import { Plus, Trash2 } from "lucide-react";

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
        <CardTitle>1. 시나리오 기본 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-md border border-[var(--mystery)]/25 bg-[var(--mystery)]/8 px-3 py-2 text-[11px] leading-relaxed text-[var(--foreground)]">
          게임은 <strong>브리핑(부원증·사건·용의자) → 구역 조사 → 최종 보고서</strong> 세 단계로 진행됩니다. 최종 보고서에서
          <strong> 범인은 아래 용의자 중에서만 </strong>고릅니다.
        </p>
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

        <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--tint-accent-weak)] p-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-[var(--accent)]">
                용의자<span className="ml-0.5 text-red-400">*</span>
              </p>
              <p className="text-[11px] text-[var(--muted-foreground)]">이름(필수)과 부가 설명(선택). 브리핑에 그대로 공개됩니다.</p>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={addSuspect}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              추가
            </Button>
          </div>
          <ul className="mt-2 space-y-3">
            {suspects.map((s) => (
              <li key={s.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
                <div className="mb-1 flex items-center justify-between gap-1">
                  <span className="text-[10px] uppercase text-[var(--muted-foreground)]">용의자</span>
                  {suspects.length > 1 ? (
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeSuspect(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
                <div className="space-y-1.5">
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
                  <span>이 인물이 사건의 <strong>범인(정답)</strong>이다</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

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
