"use client";

import { useEffect, useRef } from "react";

import {
  StepListItemCard,
  StepListRemoveButton,
  StepListSection,
  StepHint,
} from "./step-blocks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { DraftInvestigationZone } from "./types";

type Props = {
  zones: DraftInvestigationZone[];
  onAdd: (zone: Omit<DraftInvestigationZone, "tempId">) => void;
  onUpdate: (tempId: string, patch: Partial<Omit<DraftInvestigationZone, "tempId">>) => void;
  onRemove: (tempId: string) => void;
};

/**
 * 사건이 펼쳐지는 조사 구역(맵) 목록. 직책·순찰은 게임 세션에서 팀마다 랜덤 배정된다.
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
        <CardTitle>3. 조사 구역</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <StepHint>
          사건이 벌어진 장소마다 <strong>하나의 맵</strong>이 붙습니다. 의뢰를 받고 현장에 가면 그 구역에만 보이는
          단서를 둡니다. 구역 이름은 겹치지 않게 적어주세요. 세션에 들어가면 팀이 나뉘고, 부장·차장·부원과 순찰할
          구역은 그때 랜덤으로 정해집니다.
        </StepHint>

        <StepListSection
          title={
            <span>
              조사 구역<span className="ml-0.5 text-[var(--danger)]">*</span>
            </span>
          }
          description="장소명을 입력한 뒤 필요하면 아래에서 구역을 더 추가하세요."
          onAdd={() => onAdd({ zoneName: "" })}
        >
          {zones.map((z, index) => {
            const isLast = index === zones.length - 1;
            const normalized = z.zoneName.trim().toLocaleLowerCase();
            const isDuplicateZone = normalized ? (normalizedZoneCount.get(normalized) ?? 0) > 1 : false;
            const canCreateNext = z.zoneName.trim().length > 0 && !isDuplicateZone;
            return (
              <StepListItemCard key={z.tempId} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--mystery)]">
                    조사 구역 {index + 1}
                  </p>
                  <StepListRemoveButton
                    onClick={() => onRemove(z.tempId)}
                    disabled={zones.length === 1}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-[var(--muted-foreground)]">
                    장소명<span className="ml-0.5 text-[var(--danger)]">*</span>
                  </p>
                  <Input
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
                    <p className="text-xs text-[var(--danger)]">이미 같은 이름의 구역이 있습니다.</p>
                  ) : null}
                </div>
              </StepListItemCard>
            );
          })}
        </StepListSection>
      </CardContent>
    </Card>
  );
}
