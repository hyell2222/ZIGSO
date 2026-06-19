"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ActivityEditorForm } from "@/components/teacher/activity-editor-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";

type Props =
  | { mode: "create"; pageTitle?: string }
  | { mode: "edit"; activityId: string; initialPack: ActivityPack; pageTitle?: string };

function leaveEditor(router: ReturnType<typeof useRouter>) {
  if (typeof window !== "undefined" && window.opener && !window.opener.closed) {
    window.close();
    return;
  }
  router.push(ROUTES.activities);
}

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
      leaveEditor(router);
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

  const modeLabel = props.mode === "edit" ? "활동 수정" : "새 활동";

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[var(--background)]">
      <header className="flex shrink-0 items-center gap-4 border-b border-[var(--border)] bg-[var(--surface-overlay)] px-5 py-3">
        <span className="hidden shrink-0 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] sm:inline">
          {modeLabel}
        </span>

        <div className="min-w-0 flex-1">
          <div className="w-full max-w-sm">
            <Input
              id="activity-title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="활동 제목을 입력하세요"
              aria-label="활동 제목"
            />
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {errorMessage ? (
            <p
              className="hidden max-w-[12rem] truncate text-xs text-[var(--danger)] lg:block"
              role="alert"
              title={errorMessage}
            >
              {errorMessage}
            </p>
          ) : null}
          <Button type="button" onClick={handleSave} disabled={saveMutation.isPending} size="sm">
            {saveMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="mr-1.5 h-4 w-4" aria-hidden />
            )}
            저장
          </Button>
        </div>
      </header>

      {errorMessage ? (
        <p
          className={cn(
            "shrink-0 border-b border-[var(--panel-warn-border)] bg-[var(--panel-warn-bg)] px-5 py-2 text-sm text-[var(--entry-warn-ink)] lg:hidden",
          )}
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        <ActivityEditorForm draft={draft} onChange={setDraft} />
      </div>
    </div>
  );
}
