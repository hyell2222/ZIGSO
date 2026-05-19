"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PLAY_PAGE_BLACK_BG } from "@/components/play/play-atmosphere";
import { PlaySessionShell } from "@/components/play/play-session-shell";
import { LoadingState } from "@/components/ui/loading-state";
import { ROUTES } from "@/lib/routes";

function PlaySessionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code")?.trim() ?? "";
  const nick = searchParams.get("nickname")?.trim() ?? "";

  useEffect(() => {
    if (!code) {
      router.replace(ROUTES.play);
    }
  }, [code, router]);

  if (!code) {
    return (
      <div
        className="play-shell flex min-h-dvh flex-col items-center justify-center px-4"
        style={PLAY_PAGE_BLACK_BG}
      >
        <LoadingState variant="page" tone="play" className="min-h-0 py-8" />
      </div>
    );
  }

  return <PlaySessionShell joinCode={code.toUpperCase()} initialNickname={nick} />;
}

export default function PlaySessionPage() {
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
      <PlaySessionPageContent />
    </Suspense>
  );
}
