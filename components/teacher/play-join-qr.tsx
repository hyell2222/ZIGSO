"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import QRCode from "react-qr-code";

import { Modal } from "@/components/ui/modal";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

type PlayJoinQrProps = {
  joinCode: string;
  className?: string;
};

let playJoinOriginCache = "";

function subscribePlayJoinOrigin(onStoreChange: () => void) {
  queueMicrotask(() => {
    if (typeof window !== "undefined") {
      playJoinOriginCache = window.location.origin;
    }
    onStoreChange();
  });
  return () => {};
}

function getPlayJoinOriginSnapshot() {
  return playJoinOriginCache;
}

function getPlayJoinOriginServerSnapshot() {
  return "";
}

/** 학생 입장 URL QR — 썸네일 탭 시 모달로 확대 */
export function PlayJoinQr({ joinCode, className }: PlayJoinQrProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const origin = useSyncExternalStore(
    subscribePlayJoinOrigin,
    getPlayJoinOriginSnapshot,
    getPlayJoinOriginServerSnapshot,
  );

  const playUrl = useMemo(() => {
    if (!joinCode || !origin) return "";
    return `${origin}${ROUTES.playJoin(joinCode)}`;
  }, [joinCode, origin]);

  if (!playUrl) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={cn(
          "group flex shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-0.5 shadow-sm transition hover:border-[var(--accent)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
          "@md:gap-0.5 @md:p-1",
          className,
        )}
      >
        <span className="block rounded-sm bg-white p-0.5 @sm:hidden">
          <QRCode value={playUrl} size={32} style={{ display: "block" }} />
        </span>
        <span className="hidden rounded-sm bg-white p-0.5 @sm:block @sm:h-9 @sm:w-9 @md:h-11 @md:w-11 @lg:h-[52px] @lg:w-[52px]">
          <QRCode value={playUrl} size={44} style={{ width: "100%", height: "100%", display: "block" }} />
        </span>
      </button>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="학생 참가 QR"
        titleId="play-join-qr-title"
        contentClassName="space-y-4"
      >
        <p className="break-all text-center text-sm text-[var(--muted-foreground)]">{playUrl}</p>
        <div className="flex justify-center rounded-lg border border-[var(--border)] bg-white p-4">
          <QRCode value={playUrl} size={320} style={{ maxWidth: "100%", height: "auto" }} />
        </div>
        <p className="text-center text-sm text-[var(--muted-foreground)]">
          카메라로 스캔하거나 URL을 공유하세요.
        </p>
      </Modal>
    </>
  );
}
