"use client";

import { FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  joinCode: string;
  nickname: string;
  message?: string | null;
  pending?: boolean;
  title?: string;
  titleId?: string;
  description?: string;
  submitLabel?: string;
  pendingLabel?: string;
  modalVariant?: "viewport" | "contained";
  showMissingCodeHint?: boolean;
  joinCodeEditable?: boolean;
  titlePrefix?: ReactNode;
  onJoinCodeChange?: (value: string) => void;
  onNicknameChange: (value: string) => void;
  onSubmit: () => void;
};

export function PlayJoinModal({
  open,
  joinCode,
  nickname,
  message = null,
  pending = false,
  title = "닉네임 설정",
  titleId = "play-join-modal-title",
  description = "참가 코드를 확인하고 닉네임을 입력해 주세요.",
  submitLabel = "입장",
  pendingLabel = "입장 중…",
  modalVariant = "viewport",
  showMissingCodeHint = true,
  joinCodeEditable = false,
  titlePrefix,
  onJoinCodeChange,
  onNicknameChange,
  onSubmit,
}: Props) {
  const code = joinCode.trim().toUpperCase();

  return (
    <Modal
      open={open}
      onClose={() => {}}
      title={title}
      titleId={titleId}
      hideCloseButton
      closeOnBackdrop={false}
      closeOnEscape={false}
      variant={modalVariant}
      zIndexClassName={modalVariant === "contained" ? "z-20" : "z-50"}
      bodyClassName="space-y-4"
      titlePrefix={titlePrefix}
    >
      <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
      <form
        className="space-y-3"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--foreground)]" htmlFor={`${titleId}-code`}>
            참가 코드
          </label>
          <Input
            id={`${titleId}-code`}
            value={joinCodeEditable ? joinCode : code}
            readOnly={!joinCodeEditable}
            aria-readonly={joinCodeEditable ? undefined : "true"}
            onChange={
              joinCodeEditable && onJoinCodeChange
                ? (event) => onJoinCodeChange(event.target.value.toUpperCase())
                : undefined
            }
            className={cn(
              "font-semibold tracking-[0.12em]",
              joinCodeEditable ? "" : "cursor-default text-[var(--primary)]",
            )}
            placeholder={joinCodeEditable ? "예: ABC123" : undefined}
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--foreground)]" htmlFor={`${titleId}-nickname`}>
            닉네임
          </label>
          <Input
            id={`${titleId}-nickname`}
            placeholder="닉네임"
            value={nickname}
            onChange={(event) => onNicknameChange(event.target.value)}
            required
            disabled={pending}
            autoFocus
          />
        </div>
        <Button
          type="submit"
          className="w-full @md:w-auto @md:min-w-[8rem]"
          disabled={pending || !code}
        >
          {pending ? pendingLabel : submitLabel}
        </Button>
      </form>
      {showMissingCodeHint && !code ? (
        <p className="text-xs text-[var(--accent)]">
          <a className="underline hover:text-[var(--primary)]" href={ROUTES.play}>
            입장 화면
          </a>
          에서 참가 코드를 입력해 주세요.
        </p>
      ) : null}
      {message ? <p className="text-xs text-[var(--muted-foreground)]">{message}</p> : null}
    </Modal>
  );
}
