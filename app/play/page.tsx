"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { StudentJoinPage } from "@/components/play/student-join-page";
import { PlayAtmosphere } from "@/components/play/play-atmosphere";
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
        <PlayAtmosphere>
          <LoadingState variant="page" className="min-h-0 flex-1" />
        </PlayAtmosphere>
      }
    >
      <PlayPageContent />
    </Suspense>
  );
}
