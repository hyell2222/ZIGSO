"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { activityPageShell } from "@/lib/theme/activity-layout-chrome";
import { PlayAtmosphere } from "@/components/play/shell/play-atmosphere";
import { PlayJoinForm, type PlayJoinFormProps } from "@/components/play/shell/play-join-form";
import { Modal } from "@/components/ui/modal";
import { getSessionByJoinCode, joinPlayerSession, assignOrphanPlayersForOngoingSession } from "@/lib/api/play";
import { getResumeRecord, saveResumeRecord } from "@/lib/play/play-resume";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { ActivityPhase } from "@/types/index";

import { SANDBOX_JOIN_CODE } from "@/lib/sandbox/state";

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
        navigate(ROUTES.playSessionJoin(prefillJoinCode, stored.playerId), { replace: true });
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
    if (code === SANDBOX_JOIN_CODE) {
      setError("시뮬레이션 모드에서는 외부 접속을 지원하지 않습니다. 시뮬레이션 화면으로 돌아가 주세요.");
      return;
    }
    if (!hasSupabaseEnv) {
      navigate(ROUTES.playSessionJoin(code, "local-player"));
      return;
    }
    setBusy(true);
    try {
      const session = await getSessionByJoinCode(code);
      const phase = session.phase as ActivityPhase | null | undefined;
      const result = await joinPlayerSession({
        session_id: session.id,
        nickname: nick,
      });
      if (phase && phase !== "waiting" && phase !== "results") {
        await assignOrphanPlayersForOngoingSession(session.id);
      }
      saveResumeRecord({
        joinCode: code,
        sessionId: session.id,
        playerId: result.player.id,
        nickname: nick,
      });
      navigate(ROUTES.playSessionJoin(code, result.player.id));
    } catch (err: any) {
      if (err.message && err.message.includes("이미 사용 중인 닉네임")) {
        setError(err.message);
      } else {
        setError("참가 코드를 찾을 수 없어요. 선생님께 다시 확인해 주세요.");
      }
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
