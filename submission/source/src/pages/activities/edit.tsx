"use client";

import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Suspense, useEffect } from "react";

import { LoadingState } from "@/components/ui/loading-state";
import { getActivity, parseActivityPack } from "@/lib/api/activities";
import { ROUTES } from "@/lib/routes";

import { toast } from "sonner";

import { ActivitySteps } from "./activity-steps";

export default function ActivityEditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-[var(--background)]">
          <LoadingState variant="page" />
        </div>
      }
    >
      <ActivityEditContent />
    </Suspense>
  );
}

function ActivityEditContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activityId = searchParams.get("activity");

  useEffect(() => {
    if (!activityId) navigate(ROUTES.activities, { replace: true });
  }, [activityId, navigate]);

  const dataQuery = useQuery({
    queryKey: ["teacher-activity-edit", activityId],
    queryFn: () => getActivity(activityId!),
    enabled: Boolean(activityId),
  });

  useEffect(() => {
    if (dataQuery.isError) {
      toast.error(`활동을 불러오지 못했습니다: ${(dataQuery.error as Error).message}`);
      navigate(ROUTES.activities, { replace: true });
    }
  }, [dataQuery.isError, dataQuery.error, navigate]);

  useEffect(() => {
    if (dataQuery.data && !parseActivityPack(dataQuery.data.activity_pack)) {
      toast.error("이 활동에는 활동 팩이 없습니다. 새 활동으로 다시 만들어 주세요.");
      navigate(ROUTES.activities, { replace: true });
    }
  }, [dataQuery.data, navigate]);

  if (!activityId) return null;

  if (dataQuery.isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[var(--background)]">
        <LoadingState variant="page" />
      </div>
    );
  }

  if (dataQuery.isError || !dataQuery.data) return null;

  const activityPack = parseActivityPack(dataQuery.data.activity_pack);
  if (!activityPack) return null;

  return (
    <ActivitySteps
      mode="edit"
      activityId={activityId}
      initialPack={activityPack}
      initialTitle={dataQuery.data?.title ?? ""}
      pageTitle="활동 수정"
    />
  );
}
