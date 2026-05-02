"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type KebabMenuProps = {
  onDelete: () => void;
  /** 없으면 「수정」 항목을 숨깁니다. */
  onEdit?: () => void;
  disabled?: boolean;
};

export function KebabMenu({ onEdit, onDelete, disabled }: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (event: PointerEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        variant="ghost"
        size="icon"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-7 z-20 min-w-[100px] overflow-hidden rounded-md border border-[var(--border)] bg-[var(--background)] shadow-lg"
        >
          {onEdit ? (
            <KebabMenuRow
              icon={<Pencil className="h-3.5 w-3.5" />}
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              수정
            </KebabMenuRow>
          ) : null}
          <KebabMenuRow
            icon={<Trash2 className="h-3.5 w-3.5" />}
            danger
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            삭제
          </KebabMenuRow>
        </div>
      ) : null}
    </div>
  );
}

function KebabMenuRow({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={
        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors " +
        (danger
          ? "text-[var(--danger)] hover:bg-[var(--danger)]/10"
          : "text-[var(--foreground)] hover:bg-[var(--tint-mystery)]")
      }
    >
      {icon}
      {children}
    </Button>
  );
}
