"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { StudentJoinPage } from "@/components/play/student-join-page";
import { LoadingState } from "@/components/ui/loading-state";

function PlayPageContent() {
  const searchParams = useSearchParams();
  const joinCodeRaw = searchParams.get("code")?.trim() ?? "";
  const nicknameRaw = searchParams.get("nickname")?.trim() ?? "";
  return (
    <StudentJoinPage
      prefillJoinCode={joinCodeRaw ? joinCodeRaw.toUpperCase() : undefined}
      prefillNickname={nicknameRaw || undefined}
    />
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh flex-col items-center justify-center px-4">
          <LoadingState variant="page" tone="play" className="min-h-0 py-8" />
        </div>
      }
    >
      <PlayPageContent />
    </Suspense>
  );
}
