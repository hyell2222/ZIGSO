"use client";

import { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

export type PlayJoinFormProps = {
  joinCode: string;
  nickname: string;
  message?: string | null;
  pending?: boolean;
  titleId?: string;
  submitLabel?: string;
  pendingLabel?: string;
  showMissingCodeClue?: boolean;
  joinCodeEditable?: boolean;
  onJoinCodeChange?: (value: string) => void;
  onNicknameChange: (value: string) => void;
  onSubmit: () => void;
  className?: string;
};

export function playJoinCanSubmit(joinCode: string, nickname: string, pending = false) {
  return Boolean(joinCode.trim() && nickname.trim() && !pending);
}

const joinCodeReadonlyClass =
  "cursor-default font-semibold tracking-[0.12em] text-[var(--primary)]";
const nicknameReadonlyClass = "cursor-default text-[var(--foreground)]";

/** 재입장 — 참가 폼과 동일한 읽기 전용 필드 */
export function PlayJoinReadonlyFields({
  titleId,
  joinCode,
  nickname,
  className,
}: {
  titleId: string;
  joinCode: string;
  nickname: string;
  className?: string;
}) {
  const code = joinCode.trim().toUpperCase();

  return (
    <div className={cn("space-y-3", className)}>
      <FormField label="참가 코드" htmlFor={`${titleId}-code`}>
        <Input
          id={`${titleId}-code`}
          value={code}
          readOnly
          aria-readonly="true"
          tabIndex={-1}
          className={joinCodeReadonlyClass}
        />
      </FormField>
      <FormField label="닉네임" htmlFor={`${titleId}-nickname`}>
        <Input
          id={`${titleId}-nickname`}
          value={nickname}
          readOnly
          aria-readonly="true"
          tabIndex={-1}
          className={nicknameReadonlyClass}
        />
      </FormField>
    </div>
  );
}

export function PlayJoinForm({
  joinCode,
  nickname,
  message = null,
  pending = false,
  titleId = "play-join-form",
  submitLabel = "참가하기",
  pendingLabel = "불러오는 중…",
  showMissingCodeClue = true,
  joinCodeEditable = false,
  onJoinCodeChange,
  onNicknameChange,
  onSubmit,
  className,
}: PlayJoinFormProps) {
  const code = joinCode.trim().toUpperCase();
  const canSubmit = playJoinCanSubmit(joinCode, nickname, pending);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit();
  };

  return (
    <form
      id={`${titleId}-form`}
      className={cn("space-y-3", className)}
      onSubmit={handleSubmit}
    >
      <FormField label="참가 코드" htmlFor={`${titleId}-code`}>
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
          autoComplete="off"
          inputMode={joinCodeEditable ? "text" : undefined}
        />
      </FormField>
      <FormField label="닉네임" htmlFor={`${titleId}-nickname`}>
        <Input
          id={`${titleId}-nickname`}
          placeholder="닉네임"
          value={nickname}
          onChange={(event) => onNicknameChange(event.target.value)}
          disabled={pending}
          autoComplete="nickname"
          autoFocus={joinCodeEditable ? !code : Boolean(code)}
        />
      </FormField>
      <div className="flex justify-center pt-4">
        <Button type="submit" className="w-full" disabled={!canSubmit || pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
      {showMissingCodeClue && !code ? (
        <p className="text-xs text-[var(--foreground)]">
          참가 코드가 없으면{" "}
          <a className="text-[var(--accent)] hover:text-[var(--highlight)]" href={ROUTES.play}>
            입장 화면
          </a>
          에서 코드를 입력해 주세요.
        </p>
      ) : null}
      {message ? (
        <p
          role="alert"
          className={cn(
            "text-xs text-[var(--foreground)]",
            (message.includes("확인할 수 없") ||
              message.includes("입력") ||
              message.includes("실패")) &&
              "text-[var(--danger)]",
          )}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
