"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { AIActivityGenerateModal } from "@/app/activities/new/steps/ai-activity-generate-modal";
import { PageHeader } from "@/components/layout/page-header";
import { TopNav } from "@/components/layout/top-nav";
import { ActivityEditorForm } from "@/components/teacher/activity-editor-form";
import { ActivityEditorStepper } from "@/components/teacher/activity-editor-stepper";
import { Button } from "@/components/ui/button";
import { createActivity, updateActivity } from "@/lib/api/activities";
import {
  createDefaultActivityDraft,
  EDITOR_STEPS,
  editorDraftToPack,
  packToEditorDraft,
  validateEditorDraft,
  validateEditorDraftStep,
  type EditorStepId,
} from "@/lib/activity-pack/activity-draft";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { useRequireTeacherSession } from "@/lib/auth/use-require-teacher-session";
import { TEACHER_EDITOR_COPY } from "@/lib/copy/teacher";
import { ERROR_COPY } from "@/lib/copy/errors";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

type Props =
  | { mode: "create"; pageTitle?: string }
  | { mode: "edit"; activityId: string; initialPack: ActivityPack; pageTitle?: string };

export function ActivitySteps(props: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionQuery = useRequireTeacherSession();

  const [aiOpen, setAiOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [step, setStep] = useState<EditorStepId>("basics");
  const [maxReachableIndex, setMaxReachableIndex] = useState(0);

  const initialDraft = useMemo(
    () =>
      props.mode === "edit"
        ? packToEditorDraft(props.initialPack)
        : createDefaultActivityDraft(),
    [props],
  );

  const [draft, setDraft] = useState(initialDraft);

  const stepIndex = EDITOR_STEPS.findIndex((s) => s.id === step);
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === EDITOR_STEPS.length - 1;

  const handleApplyPack = useCallback((pack: ActivityPack) => {
    setDraft(packToEditorDraft(pack));
    setErrorMessage(null);
    setMaxReachableIndex(EDITOR_STEPS.length - 1);
  }, []);

  const handleStepChange = (next: EditorStepId) => {
    const nextIndex = EDITOR_STEPS.findIndex((s) => s.id === next);
    if (nextIndex <= maxReachableIndex) {
      setErrorMessage(null);
      setStep(next);
    }
  };

  const goNext = () => {
    const errors = validateEditorDraftStep(draft, step);
    if (errors.length > 0) {
      setErrorMessage(errors[0] ?? null);
      return;
    }

    setErrorMessage(null);

    const nextIndex = Math.min(stepIndex + 1, EDITOR_STEPS.length - 1);
    setMaxReachableIndex((prev) => Math.max(prev, nextIndex));
    setStep(EDITOR_STEPS[nextIndex]!.id);
  };

  const goPrev = () => {
    if (isFirstStep) return;

    setErrorMessage(null);
    setStep(EDITOR_STEPS[stepIndex - 1]!.id);
  };

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
        task_count: activityPack.tasks.length,
        group_size: activityPack.groupSize,
      };

      if (props.mode === "create") {
        const uid = sessionQuery.data?.user?.id;
        if (!uid) throw new Error(ERROR_COPY.signInRequired);
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
    <>
      <TopNav />

      <main className="mx-auto w-full min-w-0 max-w-5xl overflow-x-hidden px-4 py-6 pb-10 sm:px-6 sm:py-8">
        <div className="mb-6">
          <PageHeader
            title={
              props.pageTitle ??
              (props.mode === "edit" ? TEACHER_EDITOR_COPY.editTitle : TEACHER_EDITOR_COPY.createTitle)
            }
            description={TEACHER_EDITOR_COPY.flowDescription}
            actions={
              <Button type="button" variant="outline" onClick={() => setAiOpen(true)}>
                <Sparkles className="mr-1.5 h-4 w-4 text-[var(--primary)]" />
                {TEACHER_EDITOR_COPY.aiButton}
              </Button>
            }
          />
        </div>

        <ActivityEditorStepper
          currentStep={step}
          maxReachableIndex={maxReachableIndex}
          onStepChange={handleStepChange}
        />

        <div className="mb-6 w-full min-w-0 overflow-x-hidden">
          <ActivityEditorForm draft={draft} onChange={setDraft} step={step} />
          {errorMessage ? (
            <p
              className="mt-4 rounded-lg border border-[var(--panel-warn-border)] bg-[var(--panel-warn-bg)] px-3 py-2 text-sm text-[var(--entry-warn-ink)]"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={isFirstStep}
            onClick={goPrev}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            이전
          </Button>

          {isLastStep ? (
            <Button type="button" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              저장
            </Button>
          ) : (
            <Button type="button" onClick={goNext}>
              다음
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </main>

      <AIActivityGenerateModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onApply={handleApplyPack}
      />
    </>
  );
}