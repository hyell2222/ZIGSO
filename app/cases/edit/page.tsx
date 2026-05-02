"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";

import { TopNav } from "@/components/layout/top-nav";
import { LoadingState } from "@/components/ui/loading-state";
import { getCaseFull } from "@/lib/api/cases";
import { ROUTES } from "@/lib/routes";
import { parseSuspectRosterFromCase } from "@/lib/suspects";
import { makeTempId } from "@/lib/temp-id";

import type { Difficulty } from "../new/steps/basic-info-step";
import {
  clampPropFootprintToMapEditorCanvas,
  mapPropDisplayEditorPx,
} from "@/lib/map-prop-pixel-size";

import {
  MAP_EDITOR_WORLD,
  type DraftInvestigationZone,
  type DraftClue,
} from "../new/steps/types";
import { CaseSteps, type CaseDraft } from "../case-steps/case-steps";

function toDifficulty(value: string | null | undefined): Difficulty {
  return value === "Easy" || value === "Hard" ? value : "Normal";
}

export default function CaseEditPage() {
  return (
    <Suspense
      fallback={
        <div className="app-page flex min-h-dvh flex-col">
          <TopNav />
          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8">
            <LoadingState variant="page" />
          </main>
        </div>
      }
    >
      <CaseEditContent />
    </Suspense>
  );
}

function CaseEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("case");

  useEffect(() => {
    if (!caseId) router.replace(ROUTES.cases);
  }, [caseId, router]);

  const dataQuery = useQuery({
    queryKey: ["teacher-case-edit", caseId],
    queryFn: () => getCaseFull(caseId!),
    enabled: Boolean(caseId),
  });

  const initialDraft = useMemo<CaseDraft | null>(() => {
    if (!dataQuery.data) return null;
    const { caseRecord, locations, clues } = dataQuery.data;

    const tempIdByLocationId = new Map<string, string>();
    const draftZones: DraftInvestigationZone[] = locations.map((loc) => {
      const tempId = makeTempId();
      tempIdByLocationId.set(loc.id, tempId);
      return { tempId, zoneName: loc.name ?? "" };
    });

    const draftClues: DraftClue[] = clues
      .map((cl) => {
        const locId = cl.location_id;
        if (!locId) return null;
        const tid = tempIdByLocationId.get(locId) ?? "";
        if (!tid) return null;
        const props = cl.props ?? null;
        const raw = mapPropDisplayEditorPx(props);
        const footprint = clampPropFootprintToMapEditorCanvas(
          raw.w,
          raw.h,
          MAP_EDITOR_WORLD.w,
          MAP_EDITOR_WORLD.h,
        );
        return {
          tempId: makeTempId(),
          assignmentTempId: tid,
          asset: typeof props?.asset === "string" ? props.asset : "",
          x: Number.isFinite(props?.x) ? Number(props?.x) : MAP_EDITOR_WORLD.w / 2,
          y: Number.isFinite(props?.y) ? Number(props?.y) : MAP_EDITOR_WORLD.h / 2,
          w: footprint.w,
          h: footprint.h,
          name: cl.name ?? "",
          content: cl.content ?? "",
        } satisfies DraftClue;
      })
      .filter((v): v is DraftClue => v !== null);

    let suspects = parseSuspectRosterFromCase(caseRecord.suspect_roster);
    if (suspects.length === 0) {
      suspects = [{ id: makeTempId(), name: "", detail: "" }];
    }

    return {
      title: caseRecord.title ?? "",
      description: caseRecord.description ?? "",
      suspects,
      answerSuspectId: caseRecord.answer_suspect_id ?? "",
      difficulty: toDifficulty(caseRecord.difficulty),
      investigationZones: draftZones,
      clues: draftClues,
    };
  }, [dataQuery.data]);

  if (!caseId) return null;

  if (dataQuery.isLoading || !initialDraft) {
    return (
      <div className="app-page flex min-h-dvh flex-col">
        <TopNav />
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8">
          <LoadingState variant="page" />
        </main>
      </div>
    );
  }

  if (dataQuery.isError) {
    return (
      <div className="app-page flex min-h-dvh flex-col">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
          <p className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            사건을 불러오지 못했습니다: {(dataQuery.error as Error).message}
          </p>
        </main>
      </div>
    );
  }

  return <CaseSteps mode="edit" caseId={caseId} initialDraft={initialDraft} />;
}
