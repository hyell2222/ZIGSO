"use client";

import { StepHeading } from "./step-blocks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
        <StepHeading
          step={1}
          title="기본 정보"
          subtitle="게임은 사건 파악 → 단서 수집 → 범인 지목 단계로 진행됩니다. 이 단계에서는 사건 제목·사건 개요·난이도를 정합니다."
        />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--accent)]">
            제목<span className="ml-0.5 text-[var(--danger)]">*</span>
          </label>
          <Input
            value={title}
            onChange={(event) => onChangeTitle(event.target.value)}
            placeholder="예) 음악준비실에서 사라진 소품"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--accent)]">
            사건 개요 (사건 파악 단계에 공개)<span className="ml-0.5 text-[var(--danger)]">*</span>
          </label>
          <Textarea
            value={description}
            onChange={(event) => onChangeDescription(event.target.value)}
            placeholder="의뢰 내용, 알려진 사실, 학생들이 알아야 할 배경"
            rows={5}
          />
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
