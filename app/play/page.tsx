"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { PLAY_PAGE_BLACK_BG } from "@/components/play/play-atmosphere";
import { StudentBlackoutLanding } from "@/components/play/student-blackout-landing";
import { LoadingState } from "@/components/ui/loading-state";

function PlayPageContent() {
  const searchParams = useSearchParams();
  const joinCodeRaw = searchParams.get("code")?.trim() ?? "";
  const nicknameRaw = searchParams.get("nickname")?.trim() ?? "";
  return (
    <StudentBlackoutLanding
      prefillJoinCode={joinCodeRaw ? joinCodeRaw.toUpperCase() : undefined}
      prefillNickname={nicknameRaw || undefined}
    />
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div
          className="play-shell flex min-h-dvh flex-col items-center justify-center px-4"
          style={PLAY_PAGE_BLACK_BG}
        >
          <LoadingState variant="page" tone="play" className="min-h-0 py-8" />
        </div>
      }
    >
      <PlayPageContent />
    </Suspense>
  );
}
