"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { activityPageShell } from "@/components/activity/activity-layout-chrome";
import { PlayAtmosphere } from "@/components/play/play-atmosphere";
import { PlayJoinCard } from "@/components/play/play-join-card";
import { getSessionByJoinCode } from "@/lib/api/play";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type StudentJoinPageProps = {
  prefillJoinCode?: string;
  prefillNickname?: string;
};

export function StudentJoinPage({
  prefillJoinCode,
  prefillNickname,
}: StudentJoinPageProps = {}) {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState(() => prefillJoinCode ?? "");
  const [nickname, setNickname] = useState(() => prefillNickname ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (prefillJoinCode) setJoinCode(prefillJoinCode);
  }, [prefillJoinCode]);

  useEffect(() => {
    if (prefillNickname) setNickname(prefillNickname);
  }, [prefillNickname]);

  const codeLocked = Boolean(prefillJoinCode?.trim());

  const onSubmit = async () => {
    setError(null);
    const code = joinCode.trim().toUpperCase();
    const nick = nickname.trim();
    if (!code || !nick) {
      setError("참가 코드와 닉네임을 모두 입력해 주세요.");
      return;
    }
    if (!hasSupabaseEnv) {
      router.push(ROUTES.playSessionJoin(code, nick));
      return;
    }
    setBusy(true);
    try {
      await getSessionByJoinCode(code);
      router.push(ROUTES.playSessionJoin(code, nick));
    } catch {
      setError("참가 코드를 확인할 수 없습니다. 담당 선생님께 문의하세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PlayAtmosphere>
      <main
        className={cn(
          activityPageShell,
          "flex min-h-dvh flex-1 flex-col items-center justify-center py-8 pb-[max(2rem,env(safe-area-inset-bottom,0px))]",
        )}
      >
        <PlayJoinCard
          titleId="play-join-page"
          joinCode={joinCode}
          nickname={nickname}
          message={error}
          pending={busy}
          joinCodeEditable={!codeLocked}
          showMissingCodeClue={!codeLocked}
          onJoinCodeChange={setJoinCode}
          onNicknameChange={setNickname}
          onSubmit={() => void onSubmit()}
        />
      </main>
    </PlayAtmosphere>
  );
}
