"use client";

import { Loader2, UtensilsCrossed } from "lucide-react";
import { useMemo, useState } from "react";

import {
  PlayAtmosphere,
  playPhaseHeaderChromeInner,
  playPhaseHeaderChromeShell,
  playSurfaceCool,
} from "@/components/play/play-atmosphere";
import { PlayHeaderTeamPlace } from "@/components/play/play-header-team-place";
import { PlayPhaseHeader } from "@/components/play/play-phase-header";
import { Button } from "@/components/ui/button";
import { completeMenuForTeam, submitTrayForTeam } from "@/lib/api/play";
import { teamHasIngredientsForMenu, totalTeamScore } from "@/lib/lunch/engine";
import { menuCompleteMessage, PLAYER_MESSAGES } from "@/lib/lunch/player-messages";
import type { LunchMenu, ScenarioPack } from "@/lib/lunch/types";
import type { TeamRow } from "@/lib/api/play";
import { cn } from "@/lib/utils";

type Props = {
  pack: ScenarioPack;
  team: TeamRow;
  teamName: string | null;
  onUpdate: () => void;
  pending?: boolean;
  sandboxCompleteMenu?: (menuId: string, steps: string[]) => void;
  sandboxSubmitTray?: () => void;
};

export function TeamKitchenPanel({
  pack,
  team,
  teamName,
  onUpdate,
  pending,
  sandboxCompleteMenu,
  sandboxSubmitTray,
}: Props) {
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(pack.menus[0]?.id ?? null);
  const [selectedSteps, setSelectedSteps] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const menu = pack.menus.find((m) => m.id === selectedMenuId) ?? null;
  const completedIds = new Set(team.completed_menus.map((m) => m.menuId));
  const acquiredIds = new Set(team.acquired_ingredients.map((a) => a.ingredientId));
  const traySubmitted = Boolean(team.tray_submitted_at);
  const teamScore = totalTeamScore(team.acquired_ingredients, team.completed_menus);

  const availableCards = useMemo(() => {
    const pool = [...pack.commandCards];
    return pool.sort((a, b) => a.text.localeCompare(b.text));
  }, [pack.commandCards]);

  const toggleCard = (text: string) => {
    setSelectedSteps((prev) => {
      if (prev.includes(text)) return prev.filter((t) => t !== text);
      return [...prev, text];
    });
  };

  const handleCompleteMenu = async () => {
    if (!selectedMenuId || !menu) return;
    setMessage(null);
    setBusy(true);
    try {
      if (sandboxCompleteMenu) {
        sandboxCompleteMenu(selectedMenuId, selectedSteps);
      } else {
        await completeMenuForTeam({
          teamId: team.id,
          pack,
          menuId: selectedMenuId,
          submittedSteps: selectedSteps,
        });
      }
      setSelectedSteps([]);
      onUpdate();
      setMessage(menuCompleteMessage(menu.name));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : PLAYER_MESSAGES.operationFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitTray = async () => {
    setMessage(null);
    setBusy(true);
    try {
      if (sandboxSubmitTray) {
        sandboxSubmitTray();
      } else {
        await submitTrayForTeam(team.id, pack);
      }
      onUpdate();
      setMessage("급식판 제출 완료! 잘하셨습니다.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : PLAYER_MESSAGES.operationFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PlayAtmosphere>
      <div className="flex min-h-dvh flex-col">
        <header className={playPhaseHeaderChromeShell}>
          <div className={playPhaseHeaderChromeInner}>
            <PlayPhaseHeader
              phase={3}
              title="급식판 완성"
              description="획득한 재료로 메뉴를 만들고 영어 명령문 카드를 순서대로 골라 조리하세요."
              rightSlot={
                <PlayHeaderTeamPlace
                  teamName={teamName}
                  placeName={`${teamScore}점`}
                  placeLabel="팀 점수"
                  pending={pending}
                />
              }
            />
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-6 pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-8">
          <div className={cn("space-y-6 px-5 py-6", playSurfaceCool)}>
            <section>
              <h3 className="text-sm font-semibold text-[var(--accent)]">팀 재료</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {team.acquired_ingredients.length === 0 ? (
                  <li className="text-sm text-[var(--muted-foreground)]">아직 획득한 재료가 없습니다.</li>
                ) : (
                  team.acquired_ingredients.map((a) => (
                    <li
                      key={a.ingredientId}
                      className="rounded-full border border-[var(--border)] bg-[var(--tint-accent-weak)] px-3 py-1 text-sm"
                    >
                      {a.ingredientId.replace(/_/g, " ")} (+{a.score})
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-[var(--accent)]">오늘의 메뉴</h3>
              <ul className="mt-2 space-y-2">
                {pack.menus.map((m: LunchMenu) => {
                  const done = completedIds.has(m.id);
                  const canCook = teamHasIngredientsForMenu(team.acquired_ingredients, m);
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMenuId(m.id);
                          setSelectedSteps([]);
                          setMessage(null);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
                          selectedMenuId === m.id
                            ? "border-[var(--primary)] bg-[var(--tint-accent-weak)]"
                            : "border-[var(--border)] hover:bg-[var(--tint-mystery)]",
                          done && "opacity-70",
                        )}
                      >
                        <UtensilsCrossed className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                        <span className="flex-1 font-medium">{m.name}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {done ? "완료" : canCook ? "조리 가능" : "재료 부족"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            {menu && !completedIds.has(menu.id) ? (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--accent)]">
                  조리: {menu.name}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  필요 재료:{" "}
                  {menu.ingredientIds
                    .map((id) => (acquiredIds.has(id) ? id : `${id} (미획득)`))
                    .join(", ")}
                </p>
                <div>
                  <p className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">
                    선택한 조리 순서
                  </p>
                  <ol className="list-decimal space-y-1 pl-5 text-sm">
                    {selectedSteps.length === 0 ? (
                      <li className="text-[var(--muted-foreground)]">카드를 눌러 순서를 만드세요.</li>
                    ) : (
                      selectedSteps.map((s, i) => (
                        <li key={`${i}-${s}`}>{s}</li>
                      ))
                    )}
                  </ol>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => toggleCard(card.text)}
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-xs transition",
                        selectedSteps.includes(card.text)
                          ? "border-[var(--primary)] bg-[var(--tint-accent-strong)] text-[var(--primary)]"
                          : "border-[var(--border)] hover:border-[var(--accent)]",
                      )}
                    >
                      {card.text}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setSelectedSteps([])}>
                    순서 초기화
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCompleteMenu}
                    disabled={busy || selectedSteps.length === 0}
                  >
                    메뉴 완성
                  </Button>
                </div>
              </section>
            ) : null}

            {traySubmitted ? (
              <div className="rounded-lg border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[var(--tint-accent-weak)] p-4 text-center">
                <p className="text-lg font-bold text-[var(--primary)]">급식판 제출 완료</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">팀 점수: {teamScore}</p>
              </div>
            ) : (
              <Button
                type="button"
                className="w-full"
                size="lg"
                onClick={handleSubmitTray}
                disabled={busy || completedIds.size < pack.menus.length}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    제출 중…
                  </>
                ) : (
                  "급식판 제출"
                )}
              </Button>
            )}

            {message ? (
              <p
                className={cn(
                  "text-sm",
                  message.includes("완료") ? "text-[var(--primary)]" : "text-[var(--danger)]",
                )}
              >
                {message}
              </p>
            ) : null}
          </div>
        </main>
      </div>
    </PlayAtmosphere>
  );
}
