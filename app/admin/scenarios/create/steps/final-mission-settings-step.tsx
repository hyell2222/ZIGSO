"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PropAsset } from "@/lib/api/storage-props";
import { cn } from "@/lib/utils";

import {
  RESOLUTION_LOCATION_TEMP_ID,
  type DraftCharacter,
  type DraftClue,
} from "./types";

type Props = {
  characters: DraftCharacter[];
  clues: DraftClue[];
  propAssets: PropAsset[];
  resolutionLocationName: string;
  onChangeResolutionLocationName: (value: string) => void;
  onSetResolutionTarget: (tempId: string | null) => void;
  onToggleResolutionUnlockItem: (tempId: string, value: boolean) => void;
};

function clueLocationLabel(
  clue: DraftClue,
  charactersById: Map<string, DraftCharacter>,
): string {
  if (clue.characterTempId === RESOLUTION_LOCATION_TEMP_ID) return "최종 미션 맵";
  const ch = charactersById.get(clue.characterTempId);
  return ch ? `${ch.name}의 장소` : "기타 장소";
}

function assetPreviewUrl(propAssets: PropAsset[], asset: string): string | null {
  return propAssets.find((p) => p.asset === asset)?.url ?? null;
}

export function FinalMissionSettingsStep({
  characters,
  clues,
  propAssets,
  resolutionLocationName,
  onChangeResolutionLocationName,
  onSetResolutionTarget,
  onToggleResolutionUnlockItem,
}: Props) {
  const charactersById = useMemo(
    () => new Map(characters.map((c) => [c.tempId, c])),
    [characters],
  );

  const resolutionClues = useMemo(
    () => clues.filter((c) => c.characterTempId === RESOLUTION_LOCATION_TEMP_ID),
    [clues],
  );

  const targetId = useMemo(
    () => clues.find((c) => c.isResolutionTarget)?.tempId ?? null,
    [clues],
  );

  const unlockIds = useMemo(
    () => new Set(clues.filter((c) => c.isResolutionUnlockItem).map((c) => c.tempId)),
    [clues],
  );
  const unlockCount = unlockIds.size;

  const sortedCluesForPick = useMemo(() => {
    return [...clues].sort((a, b) => {
      const la = clueLocationLabel(a, charactersById);
      const lb = clueLocationLabel(b, charactersById);
      if (la !== lb) return la.localeCompare(lb, "ko");
      return (a.name || "").localeCompare(b.name || "", "ko");
    });
  }, [clues, charactersById]);

  return (
    <Card>
      <CardHeader className="space-y-1.5 border-b border-[var(--border)]/50 pb-3">
        <CardTitle>4. 최종 미션 설정</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        {/* 1. 진입 코드 */}
        <section className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-[var(--accent)]">미션 진입 코드</h3>
            <p className="text-[11px] text-[var(--muted-foreground,#94a3b8)]">
              학생이 이 문자열을 정확히 입력하면 최종 미션 맵이 열립니다.
            </p>
          </div>
          <label className="sr-only" htmlFor="fm-settings-access-code">
            미션 진입 코드
          </label>
          <Input
            id="fm-settings-access-code"
            value={resolutionLocationName}
            onChange={(e) => onChangeResolutionLocationName(e.target.value)}
            placeholder="예) BLUE-774 · 지하 통로"
            className="h-11 text-base"
          />
        </section>

        <div className="h-px bg-[var(--border)]/50" />

        {/* 2. 미션 타겟 */}
        <section className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-[var(--accent)]">미션 타겟</h3>
            <p className="text-[11px] text-[var(--muted-foreground,#94a3b8)]">
              <b className="text-[var(--foreground)]">최종 미션 맵</b>에 올린 소품 중에서, 학생이 맵에서 조사할 대상 하나를 고릅니다.
            </p>
          </div>

          {resolutionClues.length === 0 ? (
            <div className="rounded-lg border border-dashed border-amber-500/35 bg-amber-500/5 px-4 py-6 text-center text-sm text-amber-100/90">
              최종 미션 맵에 소품이 없습니다.
              <p className="mt-2 text-xs text-[var(--muted-foreground,#94a3b8)]">
                이전 단계(맵 에디터)에서 「최종 미션」탭을 열고 소품을 올린 뒤 다시 와주세요.
              </p>
            </div>
          ) : (
            <fieldset className="space-y-2">
              <legend className="sr-only">미션 타겟 선택</legend>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {resolutionClues.map((c) => {
                  const url = assetPreviewUrl(propAssets, c.asset);
                  const selected = targetId === c.tempId;
                  return (
                    <label
                      key={c.tempId}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                        selected
                          ? "border-emerald-500/55 bg-emerald-500/10"
                          : "border-[var(--border)] hover:border-[var(--accent)]/35",
                      )}
                    >
                      <input
                        type="radio"
                        className="mt-1"
                        name="fm-mission-target"
                        checked={selected}
                        onChange={() => onSetResolutionTarget(c.tempId)}
                      />
                      <div className="h-12 w-12 shrink-0 overflow-hidden">
                        {url ? (
                          <img
                            src={url}
                            alt=""
                            className="h-full w-full object-contain"
                            style={{ imageRendering: "pixelated" }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-[var(--muted-foreground,#94a3b8)]">
                            ?
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--foreground)]">
                          {c.name.trim() || "(이름 없음)"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
        </section>

        <div className="h-px bg-[var(--border)]/50" />

        {/* 3. 제출 아이템 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 space-y-1">
              <h3 className="text-xs font-medium text-[var(--accent)]">제출 아이템</h3>
              <p className="text-[11px] text-[var(--muted-foreground,#94a3b8)]">
                어느 장소의 단서든 정확히 <b className="text-[var(--foreground)]">3개</b>를 고릅니다. 학생이 모달에서 같은 3개를 제출해야 클리어됩니다.
              </p>
            </div>
            <span className="rounded-full px-2.5 py-1 text-xs font-bold tabular-nums">
              {unlockCount} / 3
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sortedCluesForPick.map((c) => {
              const on = unlockIds.has(c.tempId);
              const atCap = unlockCount >= 3 && !on;
              const loc = clueLocationLabel(c, charactersById);
              const url = assetPreviewUrl(propAssets, c.asset);
              return (
                <label
                  key={c.tempId}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                    on
                      ? "border-emerald-500/55 bg-emerald-500/10"
                      : "border-[var(--border)] hover:border-[var(--accent)]/35",
                    atCap && "cursor-not-allowed opacity-45 hover:border-[var(--border)]",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={atCap}
                    onChange={(e) => onToggleResolutionUnlockItem(c.tempId, e.target.checked)}
                    className="shrink-0"
                  />
                  <div className="h-12 w-12 shrink-0 overflow-hidden">
                    {url ? (
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-[var(--muted-foreground,#94a3b8)]">
                        ?
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">
                      {c.name.trim() || "(이름 없음)"}
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground,#94a3b8)]">
                      {loc}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
          {unlockCount < 3 ?(
            <p className="text-[11px] text-amber-200/85">
              {3 - unlockCount}개 더 선택해 주세요.
            </p>
          ) : null}
        </section>
      </CardContent>
    </Card>
  );
}
