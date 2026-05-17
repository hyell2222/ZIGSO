"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PLAY_PAGE_BLACK_BG } from "@/components/play/play-atmosphere";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
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

  useEffect(() => {
    const id = window.setTimeout(() => {
      document.getElementById("play-join-code")?.focus();
    }, 80);
    return () => window.clearTimeout(id);
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    <div className="play-shell min-h-dvh" style={PLAY_PAGE_BLACK_BG}>
      <Modal
        open
        onClose={() => {}}
        title="활동 참가"
        titleId="play-join-title"
        hideCloseButton
        closeOnBackdrop={false}
        closeOnEscape={false}
        titlePrefix={<span className="text-lg leading-none" aria-hidden>🎫</span>}
      >
        <p className="mb-4 text-center text-sm leading-relaxed text-[var(--muted-foreground)]">
          선생님이 알려준 <strong>참가 코드</strong>와 <strong>닉네임</strong>을 입력하면 팀 주방으로
          들어갈 수 있어요.
        </p>
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div>
            <label
              htmlFor="play-join-code"
              className="mb-1.5 block text-xs font-medium text-[var(--foreground)]"
            >
              참가 코드
            </label>
            <Input
              id="play-join-code"
              autoComplete="off"
              spellCheck={false}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              disabled={busy}
              placeholder="예: ABC123"
              className="font-semibold tracking-[0.12em]"
            />
          </div>
          <div>
            <label
              htmlFor="play-join-nickname"
              className="mb-1.5 block text-xs font-medium text-[var(--foreground)]"
            >
              닉네임
            </label>
            <Input
              id="play-join-nickname"
              autoComplete="off"
              spellCheck={false}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={busy}
              placeholder="예: 도시락왕 김코드"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={busy || !joinCode.trim() || !nickname.trim()}
            size="lg"
          >
            {busy ? "확인 중…" : "참가하기"}
          </Button>
        </form>
        {error ? (
          <p className="mt-3 text-center text-sm font-medium text-[var(--danger)]">{error}</p>
        ) : null}
      </Modal>
    </div>
  );
}
