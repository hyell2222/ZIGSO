"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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

function compactValidationError(message: string) {
  return message
    .replace(/「학습 내용 (\d+)」연습 /g, "내용 $1 · 연습 ")
    .replace(/「학습 내용 (\d+)」실전 /g, "내용 $1 · 실전 ")
    .replace(/「학습 내용 (\d+)」/g, "내용 $1")
    .replace(/(\d+)번 문항/g, "$1번");
}

function showValidationToast(errors: string[]) {
  if (errors.length === 0) return;

  const firstError = compactValidationError(errors[0] ?? "");
  const restCount = errors.length - 1;

  toast.error(restCount > 0 ? firstError + "\n외 " + restCount + "개 항목이 더 있습니다." : firstError);
}

export function ActivitySteps(props: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionQuery = useRequireTeacherSession();

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

      toast.success("활동이 저장되었습니다.");
      leaveEditor(router);
    },
    onError: (e: Error) => {
      toast.error("저장에 실패했습니다.", {
        description: e.message,
      });
    },
  });

  const handleSave = () => {
    const validationErrors = validateEditorDraft(draft);

    if (validationErrors.length > 0) {
      showValidationToast(validationErrors);
      return;
    }

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
          <Button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            size="sm"
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="mr-1.5 h-4 w-4" aria-hidden />
            )}
            저장
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <ActivityEditorForm draft={draft} onChange={setDraft} />
      </div>
    </div>
  );
}