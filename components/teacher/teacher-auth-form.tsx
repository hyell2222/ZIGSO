"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

type TeacherAuthFormProps = {
  mode: "sign-in" | "sign-up";
  onSubmit: (email: string, password: string) => Promise<void>;
  isLoading?: boolean;
  message?: string | null;
  switchHref: string;
  switchLabel: string;
  switchPrompt: string;
};

export function TeacherAuthForm({
  mode,
  onSubmit,
  isLoading,
  message,
  switchHref,
  switchLabel,
  switchPrompt,
}: TeacherAuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await onSubmit(email, password);
    } catch {
      // Mutation errors are surfaced via React Query state (`message` prop).
    }
  }

  return (
    <Modal title={mode === "sign-in" ? "로그인" : "회원가입"} titleId="teacher-auth-title">
      <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
        <FormField label="이메일" htmlFor="teacher-auth-email">
          <Input
            id="teacher-auth-email"
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </FormField>
        <FormField label="비밀번호" htmlFor="teacher-auth-password">
          <Input
            id="teacher-auth-password"
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          />
        </FormField>
        <div className="flex justify-center pt-4">
          <Button type="submit" disabled={isLoading} className="w-full">
            {mode === "sign-in" ? "로그인" : "회원가입"}
          </Button>
        </div>
        <p className="pt-3 text-center text-xs text-[var(--foreground)]">
          {switchPrompt}{" "}
          <Link href={switchHref} className="text-[var(--accent)] hover:text-[var(--highlight)]">
            {switchLabel}
          </Link>
        </p>
        {message ? <p className="text-xs text-[var(--foreground)]">{message}</p> : null}
      </form>
    </Modal>
  );
}
