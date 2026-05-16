"use client";

import { useEffect, useRef } from "react";

import {
  StepHeading,
  StepListItemCard,
  StepListRemoveButton,
} from "./step-blocks";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { DraftInvestigationZone } from "./types";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type Props = {
  zones: DraftInvestigationZone[];
  onAdd: (zone: Omit<DraftInvestigationZone, "tempId">) => void;
  onUpdate: (tempId: string, patch: Partial<Omit<DraftInvestigationZone, "tempId">>) => void;
  onRemove: (tempId: string) => void;
};

/**
 * 사건이 펼쳐지는 조사 장소(맵) 목록. 직책·조사은 게임 세션에서 팀마다 랜덤 배정된다.
 */
export function InvestigationZonesStep({ zones, onAdd, onUpdate, onRemove }: Props) {
  const didSeedEmptyList = useRef(false);
  useEffect(() => {
    if (zones.length > 0) {
      didSeedEmptyList.current = false;
      return;
    }
    if (didSeedEmptyList.current) return;
    didSeedEmptyList.current = true;
    onAdd({ zoneName: "" });
  }, [zones.length, onAdd]);

  const normalizedZoneCount = new Map<string, number>();
  for (const z of zones) {
    const normalized = z.zoneName.trim().toLocaleLowerCase();
    if (!normalized) continue;
    normalizedZoneCount.set(normalized, (normalizedZoneCount.get(normalized) ?? 0) + 1);
  }

  return (
    <Card>
      <CardHeader>
        <StepHeading
          step={3}
          title="조사 장소"
          subtitle="장소마다 맵이 하나씩 붙습니다. 장소 이름은 겹치지 않게 적어 주세요."
        />
      </CardHeader>
      <CardContent className="space-y-5">
        <ul className="space-y-5">
          {zones.map((z, index) => {
            const isLast = index === zones.length - 1;
            const normalized = z.zoneName.trim().toLocaleLowerCase();
            const isDuplicateZone = normalized ? (normalizedZoneCount.get(normalized) ?? 0) > 1 : false;
            const canCreateNext = z.zoneName.trim().length > 0 && !isDuplicateZone;
            return (
              <StepListItemCard key={z.tempId} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--mystery)]">
                    조사 장소 {index + 1}
                  </p>
                  <StepListRemoveButton
                    onClick={() => onRemove(z.tempId)}
                    disabled={zones.length === 1}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    className="text-xs font-medium text-[var(--accent)]"
                    htmlFor={`inv-zone-name-${z.tempId}`}
                  >
                    장소명<span className="ml-0.5 text-[var(--danger)]">*</span>
                  </label>
                  <Input
                    id={`inv-zone-name-${z.tempId}`}
                    value={z.zoneName}
                    onChange={(event) => onUpdate(z.tempId, { zoneName: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" || !isLast || !canCreateNext) return;
                      event.preventDefault();
                      onAdd({ zoneName: "" });
                    }}
                    placeholder="예: 옥상, 음악준비실, 도서부실"
                  />
                  {isDuplicateZone ? (
                    <p className="text-xs text-[var(--danger)]">이미 같은 이름의 장소이 있습니다.</p>
                  ) : null}
                </div>
              </StepListItemCard>
            );
          })}
        </ul>
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => onAdd({ zoneName: "" })} className="gap-1">
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            조사 장소 추가
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
