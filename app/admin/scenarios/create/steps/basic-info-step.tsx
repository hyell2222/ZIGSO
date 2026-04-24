"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const DIFFICULTIES = ["Easy", "Normal", "Hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

type Props = {
  title: string;
  description: string;
  resolutionMission: string;
  difficulty: Difficulty;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeResolutionMission: (value: string) => void;
  onChangeDifficulty: (value: Difficulty) => void;
};

export function BasicInfoStep({
  title,
  description,
  resolutionMission,
  difficulty,
  onChangeTitle,
  onChangeDescription,
  onChangeResolutionMission,
  onChangeDifficulty,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>1. 시나리오 기본 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--accent)]">
            제목<span className="ml-0.5 text-red-400">*</span>
          </label>
          <Input
            value={title}
            onChange={(event) => onChangeTitle(event.target.value)}
            placeholder="예) 사라진 졸업장의 행방"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--accent)]">
            설명<span className="ml-0.5 text-red-400">*</span>
          </label>
          <Textarea
            value={description}
            onChange={(event) => onChangeDescription(event.target.value)}
            placeholder="학생들에게 전달할 시나리오 배경/목표를 적어주세요."
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--accent)]">
            최종 미션 설명<span className="ml-0.5 text-red-400">*</span>
          </label>
          <p className="text-[11px] leading-snug text-[var(--muted-foreground,#94a3b8)]">
            학생에게 보이는 목표 문구입니다. (추리·탐험·보물찾기 등 어떤 테마에도 사용할 수 있어요.)
          </p>
          <Input
            value={resolutionMission}
            onChange={(event) => onChangeResolutionMission(event.target.value)}
            placeholder="예) 최종 보관함을 여는 열쇠를 모으세요"
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
                      ? "border-[var(--accent)] bg-[rgba(201,209,107,0.18)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--foreground)] hover:bg-[rgba(36,40,43,0.85)]")
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

export { DIFFICULTIES };
