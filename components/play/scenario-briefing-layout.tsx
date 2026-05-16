"use client";

import { UtensilsCrossed } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { PLAYER_MESSAGES } from "@/lib/lunch/player-messages";
import type { ScenarioPack } from "@/lib/lunch/types";

type Props = {
  loading: boolean;
  title: string | null;
  description: string | null;
  scenarioPack: ScenarioPack | null;
  compact?: boolean;
};

const menuCard =
  "border-[var(--play-border-warm)] bg-[var(--play-panel-warm)] text-[var(--foreground)] shadow-[var(--play-shadow-lift)]";

export function ScenarioBriefingLayout({
  loading,
  title,
  description,
  scenarioPack,
  compact,
}: Props) {
  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-[min(20rem,46dvh)] py-6">
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
          <CardTitle className="text-base text-[var(--foreground)]">오늘의 급식</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4 text-sm leading-relaxed text-[var(--foreground)]">
          <p className="text-lg font-semibold">{title ?? PLAYER_MESSAGES.defaultPackTitle}</p>
          <p className="text-[var(--muted-foreground)]">{description ?? "—"}</p>
          <p className="rounded-md border border-[var(--border)] bg-[var(--tint-accent-weak)] px-3 py-2 text-xs">
            밥 · 국 · 반찬 3개 · 후식 — 제한 시간 안에 팀 급식판을 완성하세요.
          </p>
        </CardContent>
      </Card>

      <Card className={menuCard}>
        <CardHeader className="border-b border-[var(--border)] bg-[var(--panel-warn-bg)]">
          <CardTitle className="flex items-center gap-2 text-base text-[var(--foreground)]">
            <UtensilsCrossed className="h-4 w-4 text-[var(--accent)]" aria-hidden />
            메뉴 목록
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {!scenarioPack?.menus?.length ? (
            <p className="text-sm text-[var(--muted-foreground)]">메뉴 정보가 없습니다.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {scenarioPack.menus.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] px-3 py-2"
                >
                  <span className="font-medium">{m.name}</span>
                  <span className="text-xs uppercase text-[var(--muted-foreground)]">{m.slot}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
