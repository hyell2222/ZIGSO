"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PlayAtmosphere } from "@/components/play/play-atmosphere";
import { PlayJoinModal } from "@/components/play/play-join-modal";
import { getSessionByJoinCode } from "@/lib/api/play";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

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
    if (!code || !nick) return;
    if (!hasSupabaseEnv) {
      router.push(ROUTES.playJoin(code, nick));
      return;
    }
    setBusy(true);
    try {
      await getSessionByJoinCode(code);
      router.push(ROUTES.playJoin(code, nick));
    } catch {
      setError("참가 코드를 확인할 수 없습니다. 담당 선생님께 문의하세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PlayAtmosphere>
      <PlayJoinModal
        open
        joinCode={joinCode}
        nickname={nickname}
        message={error}
        pending={busy}
        title="활동 참가"
        titleId="play-join-title"
        description="선생님이 알려준 참가 코드와 닉네임을 입력하면 활동에 참가할 수 있어요."
        submitLabel={busy ? "확인 중…" : "참가하기"}
        pendingLabel="확인 중…"
        joinCodeEditable={!codeLocked}
        onJoinCodeChange={setJoinCode}
        onNicknameChange={setNickname}
        onSubmit={() => void onSubmit()}
        showMissingCodeHint={!codeLocked}
        titlePrefix={<span className="text-lg leading-none" aria-hidden>🎫</span>}
      />
    </PlayAtmosphere>
  );
}
