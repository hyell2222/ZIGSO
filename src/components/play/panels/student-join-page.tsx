"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { activityPageShell } from "@/lib/theme/activity-layout-chrome";
import { PlayAtmosphere } from "@/components/play/shell/play-atmosphere";
import { PlayJoinForm, type PlayJoinFormProps } from "@/components/play/shell/play-join-form";
import { Modal } from "@/components/ui/modal";
import { getSessionByJoinCode } from "@/lib/api/play";
import { getResumeRecord } from "@/lib/play/play-resume";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type PlayJoinCardProps = Omit<PlayJoinFormProps, "className"> & {
  title?: string;
  description?: string;
};

function PlayJoinCard({
  title = "활동 참가",
  titleId = "play-join-card",
  submitLabel = "참가하기",
  ...formProps
}: PlayJoinCardProps) {
  return (
    <Modal title={title} titleId={titleId}>
      <PlayJoinForm titleId={titleId} submitLabel={submitLabel} {...formProps} />
    </Modal>
  );
}

type StudentJoinPageProps = {
  prefillJoinCode?: string;
  prefillNickname?: string;
};

export function StudentJoinPage({
  prefillJoinCode,
  prefillNickname,
}: StudentJoinPageProps = {}) {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState(() => prefillJoinCode ?? "");
  const [nickname, setNickname] = useState(() => prefillNickname ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (prefillJoinCode) {
      const stored = getResumeRecord(prefillJoinCode);
      if (stored) {
        navigate(ROUTES.playSessionJoin(prefillJoinCode), { replace: true });
        return;
      }
      setJoinCode(prefillJoinCode);
    }
  }, [prefillJoinCode, navigate]);

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
      navigate(ROUTES.playSessionJoin(code, nick));
      return;
    }
    setBusy(true);
    try {
      await getSessionByJoinCode(code);
      navigate(ROUTES.playSessionJoin(code, nick));
    } catch {
      setError("참가 코드를 찾을 수 없어요. 선생님께 다시 확인해 주세요.");
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
