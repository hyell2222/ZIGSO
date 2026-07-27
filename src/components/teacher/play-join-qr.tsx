"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import QRCode from "react-qr-code";

import { activityBannerButtonClass } from "@/lib/theme/activity-layout-chrome";
import { useGuideModalScope } from "@/components/play/modals/guide-modal-scope";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ROUTES } from "@/lib/routes";
import { Z } from "@/lib/ui/z-index";
import { cn } from "@/lib/utils";
import { Check, Copy, QrCode } from "lucide-react";

type PlayJoinQrProps = {
  joinCode: string;
  className?: string;
  /** thumbnail: QR 미리보기 · button: 헤더용 축소 버튼 */
  variant?: "thumbnail" | "button";
  size?: "default" | "sm";
};

let playJoinOriginCache = "";

function subscribePlayJoinOrigin(onStoreChange: () => void) {
  queueMicrotask(() => {
    if (typeof window !== "undefined") {
      const publicUrl = import.meta.env.VITE_PUBLIC_URL || "https://zigso.vercel.app";
      if (window.location.protocol === "file:") {
        playJoinOriginCache = publicUrl;
      } else {
        playJoinOriginCache = window.location.origin;
      }
    }
    onStoreChange();
  });
  return () => { };
}

function getPlayJoinOriginSnapshot() {
  return playJoinOriginCache;
}

function getPlayJoinOriginServerSnapshot() {
  return "";
}

/** 학생 참가 URL QR — 썸네일 또는 QR 공유 버튼, 탭 시 모달 */
export function PlayJoinQr({
  joinCode,
  className,
  variant = "thumbnail",
  size,
}: PlayJoinQrProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const scopeRoot = useGuideModalScope();
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

  const useScope = Boolean(scopeRoot);
  const modalNode = modalOpen ? (
    <Modal
      open
      onClose={() => setModalOpen(false)}
      title="학생 참가 QR"
      titleId="play-join-qr-title"
      contentClassName="space-y-4"
      variant={useScope ? "contained" : "viewport"}
      zIndexClassName={useScope ? Z.hostTool : Z.modal}
    >
      <div className="flex justify-center">
        <QRCode value={playUrl} size={320} style={{ maxWidth: "100%", height: "auto" }} />
      </div>
      <div className="flex flex-col">
        <div className="text-center text-sm">
          <span className="text-[var(--muted-foreground)]">입장 코드: </span>
          <span className="font-bold tracking-wider text-[var(--primary)]">{joinCode}</span>
        </div>
        <div className="flex flex-row gap-2 justify-center items-center">
          <p className="break-all text-center text-sm text-[var(--muted-foreground)]">{playUrl}</p>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 text-[var(--primary)]"
            onClick={async () => {
              await navigator.clipboard.writeText(playUrl);

              setIsCopied(true);

              setTimeout(() => {
                setIsCopied(false);
              }, 2000);
            }}
          >
            {isCopied ? <Check /> : <Copy />}
          </Button>
        </div>
      </div>
    </Modal>
  ) : null;

  return (
    <>
      {variant === "button" ? (
        <Button
          type="button"
          variant="secondary"
          size={size}
          className={cn(
            activityBannerButtonClass,
            "shrink-0 text-[var(--foreground)]",
            className,
          )}
          onClick={() => setModalOpen(true)}
        >
          <QrCode className="h-4 w-4 shrink-0" aria-hidden />
          <span>QR 공유</span>
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={cn(
            "group flex shrink-0 flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-0.5 shadow-sm transition hover:border-[var(--accent)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
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
      )}

      {useScope && scopeRoot && modalNode
        ? createPortal(modalNode, scopeRoot)
        : modalNode}
    </>
  );
}
