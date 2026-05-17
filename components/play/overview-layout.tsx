"use client";

import { ListChecks } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { PLAYER_MESSAGES } from "@/lib/activity-pack/player-messages";
import { PLAY_STUDENT_COPY } from "@/lib/play/student-copy";
import type { ActivityPack } from "@/lib/activity-pack/types";

type Props = {
  loading: boolean;
  title: string | null;
  description: string | null;
  activityPack: ActivityPack | null;
  compact?: boolean;
};

const taskListCard =
  "border-[var(--play-border-warm)] bg-[var(--play-panel-warm)] text-[var(--foreground)] shadow-[var(--play-shadow-lift)]";

export function ActivityIntroductionLayout({
  loading,
  title,
  description,
  activityPack,
  compact,
}: Props) {
  if (loading) {
    return (
      <div className="flex min-h-[min(20rem,46dvh)] flex-1 flex-col items-center justify-center py-6">
        <LoadingState variant="section" tone="play" label="불러오는 중…" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid sm:grid-cols-2",
        compact ? "gap-3" : "gap-4 sm:gap-5 md:gap-6",
      )}
    >
      <Card className="border-[var(--play-border-cool)] bg-[var(--play-panel-cool)]">
        <CardHeader className="border-b border-[var(--play-border-cool)] bg-[var(--play-veil)]">
          <CardTitle className="text-base text-[var(--foreground)]">활동 안내</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4 text-sm leading-relaxed text-[var(--foreground)]">
          <p className="text-lg font-semibold">{title ?? PLAYER_MESSAGES.defaultPackTitle}</p>
          <p className="text-[var(--muted-foreground)]">{description ?? "—"}</p>
          <p className="rounded-md border border-[var(--border)] bg-[var(--tint-accent-weak)] px-3 py-2 text-xs">
            {PLAY_STUDENT_COPY.intro.timeHint}
          </p>
        </CardContent>
      </Card>

      <Card className={taskListCard}>
        <CardHeader className="border-b border-[var(--border)] bg-[var(--panel-warn-bg)]">
          <CardTitle className="flex items-center gap-2 text-base text-[var(--foreground)]">
            <ListChecks className="h-4 w-4 text-[var(--accent)]" aria-hidden />
            과제 목록
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {!activityPack?.tasks?.length ? (
            <p className="text-sm text-[var(--muted-foreground)]">과제 정보가 없습니다.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {activityPack.tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] px-3 py-2"
                >
                  <span className="font-medium">{task.name}</span>
                  <span className="text-xs uppercase text-[var(--muted-foreground)]">{task.slot}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
