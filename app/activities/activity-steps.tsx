"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { TopNav } from "@/components/layout/top-nav";
import { ActivityEditorForm } from "@/components/teacher/activity-editor-form";
import { Button } from "@/components/ui/button";
import { createActivity, updateActivity } from "@/lib/api/activities";
import {
  createDefaultActivityDraft,
  editorDraftToPack,
  packToEditorDraft,
  validateEditorDraft,
} from "@/lib/activity-pack/activity-draft";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { useRequireTeacherSession } from "@/lib/auth/use-require-teacher-session";
import { ROUTES } from "@/lib/routes";

type Props =
  | { mode: "create"; pageTitle?: string }
  | { mode: "edit"; activityId: string; initialPack: ActivityPack; pageTitle?: string };

export function ActivitySteps(props: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionQuery = useRequireTeacherSession();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initialDraft = useMemo(
    () =>
      props.mode === "edit"
        ? packToEditorDraft(props.initialPack)
        : createDefaultActivityDraft(),
    [props],
  );

  const [draft, setDraft] = useState(initialDraft);

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

  const handleSave = () => {
    const allErrors = validateEditorDraft(draft);
    if (allErrors.length > 0) {
      setErrorMessage(allErrors[0] ?? null);
      return;
    }

    setErrorMessage(null);
    saveMutation.mutate();
  };

  return (
    <div className="app-page">
      <TopNav />

      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 overflow-x-hidden px-4 py-6 pb-10 sm:py-8">
        <div className="mb-6">
          <PageHeader
            title={
              props.pageTitle ?? (props.mode === "edit" ? "활동 수정" : "활동 만들기")
            }
          />
        </div>

        <div className="mb-6 w-full min-w-0 overflow-x-hidden">
          <ActivityEditorForm draft={draft} onChange={setDraft} />
          {errorMessage ? (
            <p
              className="mt-4 rounded-lg border border-[var(--panel-warn-border)] bg-[var(--panel-warn-bg)] px-3 py-2 text-sm text-[var(--entry-warn-ink)]"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin text-[var(--primary)]" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            저장
          </Button>
        </div>
      </main>
    </div>
  );
}
