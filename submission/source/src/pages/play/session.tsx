"use client";

import { Suspense, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { PlayAtmosphere } from "@/components/play/shell/play-atmosphere";
import { PlaySessionShell } from "@/components/play/shell/play-session-shell";
import { activityViewportRoot } from "@/lib/theme/activity-layout-chrome";
import { GuideModalScope } from "@/components/play/modals/guide-modal-scope";
import { LoadingState } from "@/components/ui/loading-state";
import { ROUTES } from "@/lib/routes";

function PlaySessionPageContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code")?.trim() ?? "";
  const nick = searchParams.get("nickname")?.trim() ?? "";

  useEffect(() => {
    if (!code) {
      navigate(ROUTES.play, { replace: true });
    }
  }, [code, navigate]);

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
