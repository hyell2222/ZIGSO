"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PlayAtmosphere } from "@/components/play/play-atmosphere";
import { PlaySessionShell } from "@/components/play/play-session-shell";
import { activityViewportRoot } from "@/components/activity/activity-layout-chrome";
import { GuideModalScope } from "@/components/play/guide-modal-scope";
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
      <PlayAtmosphere>
        <LoadingState variant="page" className="min-h-0 flex-1" />
      </PlayAtmosphere>
    );
  }

  return (
    <GuideModalScope className={activityViewportRoot}>
      <PlaySessionShell joinCode={code.toUpperCase()} initialNickname={nick} />
    </GuideModalScope>
  );
}

export default function PlaySessionPage() {
  return (
    <Suspense
      fallback={
        <PlayAtmosphere>
          <LoadingState variant="page" className="min-h-0 flex-1" />
        </PlayAtmosphere>
      }
    >
      <PlaySessionPageContent />
    </Suspense>
  );
}
