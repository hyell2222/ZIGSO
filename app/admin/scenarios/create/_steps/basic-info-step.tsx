"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const DIFFICULTIES = ["Easy", "Normal", "Hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

type Props = {
  title: string;
  description: string;
  difficulty: Difficulty;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeDifficulty: (value: Difficulty) => void;
};

export function BasicInfoStep({
  title,
  description,
  difficulty,
  onChangeTitle,
  onChangeDescription,
  onChangeDifficulty,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>1. 시나리오 기본 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--accent)]">제목</label>
          <Input
            value={title}
            onChange={(event) => onChangeTitle(event.target.value)}
            placeholder="예) 사라진 졸업장의 행방"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--accent)]">설명</label>
          <Textarea
            value={description}
            onChange={(event) => onChangeDescription(event.target.value)}
            placeholder="학생들에게 전달할 시나리오 배경/목표를 적어주세요."
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--accent)]">난이도</label>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => {
              const active = difficulty === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChangeDifficulty(d)}
                  className={
                    "rounded-md border px-3 py-1.5 text-sm transition-colors " +
                    (active
                      ? "border-[var(--accent)] bg-[rgba(201,209,107,0.18)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--foreground)] hover:bg-[rgba(36,40,43,0.85)]")
                  }
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { DIFFICULTIES };
