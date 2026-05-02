"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import QRCode from "react-qr-code";

import { Modal } from "@/components/ui/modal";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

type PlayJoinQrProps = {
  joinCode: string;
  /** 썸네일 QR 한 변 길이(px) */
  size?: number;
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
export function PlayJoinQr({ joinCode, size = 52, className }: PlayJoinQrProps) {
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
          "cursor-pointer group flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-1 shadow-sm transition hover:border-[var(--accent)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
          className,
        )}
      >
        <span className="block h-[52px] w-[52px] rounded-sm bg-white p-0.5 md:h-[4.5rem] md:w-[4.5rem]">
          <QRCode
            value={playUrl}
            size={Math.max(size, 180)}
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </span>
      </button>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="학생 참가 QR"
        titleId="play-join-qr-title"
        maxWidthClassName="max-w-sm md:max-w-md"
        bodyClassName="space-y-4"
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
