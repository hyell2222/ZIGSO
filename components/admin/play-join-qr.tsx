"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

type PlayJoinQrProps = {
  joinCode: string;
  /** 썸네일 QR 한 변 길이(px) */
  size?: number;
  className?: string;
};

/**
 * 학생 입장 URL `/play?code=...` QR. 썸네일은 작게, 탭/클릭 시 모달로 확대.
 */
export function PlayJoinQr({ joinCode, size = 52, className }: PlayJoinQrProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

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
          "group flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-1 shadow-sm transition hover:border-[var(--accent)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
          className,
        )}
      >
        <span className="block rounded-sm bg-white p-0.5">
          <QRCode value={playUrl} size={size} style={{ width: "100%", maxWidth: size, height: "auto" }} />
        </span>
      </button>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="play-join-qr-title"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="play-join-qr-title" className="text-sm font-semibold text-[var(--foreground)]">
                학생 입장 QR
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setModalOpen(false)}
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="mb-4 break-all text-center text-xs text-[var(--muted-foreground)]">{playUrl}</p>
            <div className="flex justify-center rounded-lg border border-[var(--border)] bg-white p-4">
              <QRCode value={playUrl} size={240} style={{ maxWidth: "100%", height: "auto" }} />
            </div>
            <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">
              카메라로 스캔하거나 URL을 공유하세요.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
