"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { AIActivityGenerateModal } from "@/app/activities/new/steps/ai-activity-generate-modal";
import { ActivityEditorForm } from "@/components/teacher/activity-editor-form";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { useRequireTeacherSession } from "@/lib/auth/use-require-teacher-session";
import { createActivity, updateActivity } from "@/lib/api/activities";
import {
  createDefaultActivityDraft,
  editorDraftToPack,
  packToEditorDraft,
  validateEditorDraft,
} from "@/lib/activity-pack/activity-draft";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { ROUTES } from "@/lib/routes";

type Props =
  | { mode: "create"; pageTitle?: string }
  | { mode: "edit"; activityId: string; initialPack: ActivityPack; pageTitle?: string };

export function ActivitySteps(props: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionQuery = useRequireTeacherSession();
  const [aiOpen, setAiOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initialDraft = useMemo(
    () =>
      props.mode === "edit"
        ? packToEditorDraft(props.initialPack)
        : createDefaultActivityDraft(),
    [props],
  );

  const [draft, setDraft] = useState(initialDraft);

  const handleApplyPack = useCallback((pack: ActivityPack) => {
    setDraft(packToEditorDraft(pack));
    setErrorMessage(null);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validationErrors = validateEditorDraft(draft);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors[0]);
      }

      const activityPack = editorDraftToPack(draft);

      const payload = {
        title: activityPack.title,
        description: activityPack.description,
        activity_pack: activityPack,
        difficulty: activityPack.difficulty,
        task_count: activityPack.tasks.length,
        group_size: activityPack.groupSize,
      };

      if (props.mode === "create") {
        const uid = sessionQuery.data?.user?.id;
        if (!uid) throw new Error("로그인이 필요합니다.");
        await createActivity({ ...payload, creator_id: uid });
      } else {
        await updateActivity(props.activityId, payload);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teacher-activities"] });
      router.push(ROUTES.activities);
    },
    onError: (e: Error) => setErrorMessage(e.message),
  });

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={() => router.push(ROUTES.activities)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            활동 목록
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
          {props.pageTitle ?? (props.mode === "edit" ? "활동 수정" : "활동 만들기")}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          과제마다 맞출 항목·5단계 힌트·수행 순서를 입력하세요. 저장 시 활동 팩으로
          자동 구성됩니다.
        </p>

        <div className="mt-8">
          <ActivityEditorForm draft={draft} onChange={setDraft} />
          {errorMessage ? (
            <p className="mt-4 text-sm text-[var(--danger)]">{errorMessage}</p>
          ) : null}
        </div>
      </main>

      <AIActivityGenerateModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        initialDifficulty={draft.difficulty}
        onApply={handleApplyPack}
      />
    </>
  );
}