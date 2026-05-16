"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { AIScenarioGenerateModal } from "@/app/cases/new/steps/ai-scenario-generate-modal";
import { ScenarioEditorForm } from "@/components/teacher/scenario-editor-form";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { useRequireTeacherSession } from "@/lib/auth/use-require-teacher-session";
import { createLesson, updateLesson } from "@/lib/api/lessons";
import {
  createDefaultTrayDraft,
  editorDraftToPack,
  packToEditorDraft,
  validateEditorDraft,
} from "@/lib/lunch/scenario-draft";
import type { ScenarioPack } from "@/lib/lunch/types";
import { ROUTES } from "@/lib/routes";

type Props =
  | { mode: "create"; pageTitle?: string }
  | { mode: "edit"; lessonId: string; initialPack: ScenarioPack; pageTitle?: string };

export function ScenarioSteps(props: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionQuery = useRequireTeacherSession();
  const [aiOpen, setAiOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initialDraft = useMemo(
    () =>
      props.mode === "edit"
        ? packToEditorDraft(props.initialPack)
        : createDefaultTrayDraft(),
    [props],
  );

  const [draft, setDraft] = useState(initialDraft);

  const handleApplyPack = useCallback((pack: ScenarioPack) => {
    setDraft(packToEditorDraft(pack));
    setErrorMessage(null);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validationErrors = validateEditorDraft(draft);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors[0]);
      }

      const scenarioPack = editorDraftToPack(draft);

      const payload = {
        title: scenarioPack.title,
        description: scenarioPack.description,
        scenario_pack: scenarioPack,
        difficulty: scenarioPack.difficulty,
        english_level: scenarioPack.englishLevel,
        menu_count: scenarioPack.menus.length,
        team_size: scenarioPack.teamSize,
      };

      if (props.mode === "create") {
        const uid = sessionQuery.data?.user?.id;
        if (!uid) throw new Error("로그인이 필요합니다.");
        await createLesson({ ...payload, creator_id: uid });
      } else {
        await updateLesson(props.lessonId, payload);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teacher-scenarios"] });
      router.push(ROUTES.cases);
    },
    onError: (e: Error) => setErrorMessage(e.message),
  });

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={() => router.push(ROUTES.cases)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            수업 목록
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setAiOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              AI로 채우기
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              저장
            </Button>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {props.pageTitle ?? (props.mode === "edit" ? "수업 수정" : "수업 만들기")}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          급식판 메뉴마다 재료·5단계 영어 힌트·조리 순서를 입력하세요. 저장 시 School Lunch Rush
          템플릿으로 자동 구성됩니다.
        </p>

        <div className="mt-8">
          <ScenarioEditorForm draft={draft} onChange={setDraft} />
          {errorMessage ? (
            <p className="mt-4 text-sm text-[var(--danger)]">{errorMessage}</p>
          ) : null}
        </div>
      </main>

      <AIScenarioGenerateModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        initialDifficulty={draft.difficulty}
        onApply={handleApplyPack}
      />
    </>
  );
}