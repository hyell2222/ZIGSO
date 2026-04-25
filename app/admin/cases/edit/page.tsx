"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";

import { TopNav } from "@/components/layout/top-nav";
import { getCaseFull } from "@/lib/api/cases";
import { ROUTES } from "@/lib/routes";
import { parseSuspectRosterFromCase, textLinesToSuspectRoster } from "@/lib/suspects";

import type { Difficulty } from "../create/steps/basic-info-step";
import {
  MAP_EDITOR_WORLD,
  PROP_DEFAULT_DROP_SIZE,
  type DraftInvestigationZone,
  type DraftClue,
} from "../create/steps/types";
import { CaseWizard, type CaseDraft } from "../wizard/case-wizard";

function makeTempId() {
  return Math.random().toString(36).slice(2, 10);
}

function toDifficulty(value: string | null | undefined): Difficulty {
  return value === "Easy" || value === "Hard" ? value : "Normal";
}

export default function AdminCaseEditPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <TopNav />
          <main className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-8 text-sm text-[var(--muted-foreground,#94a3b8)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            준비 중...
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
  const caseId = searchParams.get("id");

  useEffect(() => {
    if (!caseId) router.replace(ROUTES.admin.cases);
  }, [caseId, router]);

  const dataQuery = useQuery({
    queryKey: ["admin-case-edit", caseId],
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
        return {
          tempId: makeTempId(),
          assignmentTempId: tid,
          asset: typeof props?.asset === "string" ? props.asset : "",
          x: Number.isFinite(props?.x) ? Number(props?.x) : MAP_EDITOR_WORLD.w / 2,
          y: Number.isFinite(props?.y) ? Number(props?.y) : MAP_EDITOR_WORLD.h / 2,
          w: Number.isFinite(props?.w) ? Number(props?.w) : PROP_DEFAULT_DROP_SIZE.w,
          h: Number.isFinite(props?.h) ? Number(props?.h) : PROP_DEFAULT_DROP_SIZE.h,
          name: cl.name ?? "",
          content: cl.content ?? "",
        } satisfies DraftClue;
      })
      .filter((v): v is DraftClue => v !== null);

    let suspects = parseSuspectRosterFromCase(caseRecord.suspect_roster);
    if (suspects.length === 0) {
      const legacy =
        typeof caseRecord.suspect_profiles === "string"
          ? caseRecord.suspect_profiles
          : caseRecord.suspect_profiles != null
            ? JSON.stringify(caseRecord.suspect_profiles)
            : "";
      if (legacy.trim()) suspects = textLinesToSuspectRoster(legacy, makeTempId);
    }
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
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-8 text-sm text-[var(--muted-foreground,#94a3b8)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          시나리오를 불러오는 중...
        </main>
      </div>
    );
  }

  if (dataQuery.isError) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            시나리오를 불러오지 못했습니다: {(dataQuery.error as Error).message}
          </p>
        </main>
      </div>
    );
  }

  return <CaseWizard mode="edit" caseId={caseId} initialDraft={initialDraft} />;
}
