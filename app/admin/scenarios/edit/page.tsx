"use client";

/**
 * 시나리오 수정 페이지.
 *
 * Static export 호환을 위해 dynamic segment 대신 ?id= 쿼리 파라미터를 사용한다.
 * (lib/routes.ts ROUTES.admin.scenariosEdit 참고)
 *
 * URL 의 id 로 시나리오 + 자식 (characters/locations/clues) 를 한 번에 로드한 뒤,
 * 클라이언트 wizard 가 사용하는 DraftCharacter / DraftClue 형태로 변환해서 넘겨준다.
 */

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";

import { TopNav } from "@/components/layout/top-nav";
import { getScenarioFull } from "@/lib/api/scenarios";
import { ROUTES } from "@/lib/routes";

import type { Difficulty } from "../create/steps/basic-info-step";
import {
  MAP_EDITOR_WORLD,
  PROP_DEFAULT_DROP_SIZE,
  type DraftCharacter,
  type DraftClue,
} from "../create/steps/types";
import { ScenarioWizard, type ScenarioDraft } from "../_wizard/scenario-wizard";

function makeTempId() {
  return Math.random().toString(36).slice(2, 10);
}

function toDifficulty(value: string | null | undefined): Difficulty {
  return value === "Easy" || value === "Hard" ? value : "Normal";
}

export default function AdminScenarioEditPage() {
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
      <ScenarioEditContent />
    </Suspense>
  );
}

function ScenarioEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get("id");

  useEffect(() => {
    if (!scenarioId) router.replace(ROUTES.admin.scenarios);
  }, [scenarioId, router]);

  const dataQuery = useQuery({
    queryKey: ["admin-scenario-edit", scenarioId],
    queryFn: () => getScenarioFull(scenarioId!),
    enabled: Boolean(scenarioId),
  });

  const initialDraft = useMemo<ScenarioDraft | null>(() => {
    if (!dataQuery.data) return null;
    const { scenario, characters, locations, clues } = dataQuery.data;

    // DB id → tempId 매핑. DraftClue.characterTempId 는 client 임시 ID 라
    // location → character → tempId 순서로 다리를 놓아 단서를 알맞은 캐릭터에 연결한다.
    const tempIdByCharacterId = new Map<string, string>();
    const draftCharacters: DraftCharacter[] = characters.map((c) => {
      const tempId = makeTempId();
      tempIdByCharacterId.set(c.id, tempId);
      return { tempId, name: c.name ?? "", role: c.role ?? "" };
    });

    const characterIdByLocationId = new Map<string, string | null>();
    for (const loc of locations) characterIdByLocationId.set(loc.id, loc.character_id);

    const draftClues: DraftClue[] = clues
      .map((cl) => {
        const charId = cl.location_id
          ? characterIdByLocationId.get(cl.location_id) ?? null
          : null;
        const characterTempId = charId ? tempIdByCharacterId.get(charId) ?? "" : "";
        if (!characterTempId) return null;
        const props = cl.props ?? null;
        return {
          tempId: makeTempId(),
          characterTempId,
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

    return {
      title: scenario.title ?? "",
      description: scenario.description ?? "",
      difficulty: toDifficulty(scenario.difficulty),
      characters: draftCharacters,
      clues: draftClues,
    };
  }, [dataQuery.data]);

  if (!scenarioId) return null;

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

  return (
    <ScenarioWizard
      mode="edit"
      scenarioId={scenarioId}
      initialDraft={initialDraft}
    />
  );
}
