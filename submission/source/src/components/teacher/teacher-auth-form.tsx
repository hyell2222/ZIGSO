"use client";

import { FormEvent, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

type TeacherAuthFormProps = {
  onSubmit: (email: string, password: string) => Promise<void>;
  onGoogleSignIn: () => void;
  isLoading?: boolean;
  isGooglePending?: boolean;
};

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function TeacherAuthForm({
  onSubmit,
  onGoogleSignIn,
  isLoading,
  isGooglePending,
}: TeacherAuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showMasterForm, setShowMasterForm] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await onSubmit(email, password);
    } catch {
      // Mutation errors are surfaced via React Query state (e.g. toasts).
    }
  }

  const handleMasterClick = () => {
    setEmail("test@example.com");
    setPassword("123456");
    setShowMasterForm(true);
  };

  return (
    <Modal title="로그인" titleId="teacher-auth-title">
      <div className="space-y-4">
        {!showMasterForm ? (
          <>
            {/* Google Login Button */}
            <Button
              type="button"
              variant="secondary"
              onClick={onGoogleSignIn}
              disabled={isLoading || isGooglePending}
              className="w-full flex items-center justify-center gap-3 h-12 text-base font-semibold border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--tint-primary-weak)] transition-all"
            >
              <GoogleIcon className="w-5 h-5" />
              Google 계정으로 계속하기
            </Button>

            {/* Master Account Login Button */}
            <Button
              type="button"
              variant="secondary"
              onClick={handleMasterClick}
              disabled={isLoading || isGooglePending}
              className="w-full flex items-center justify-center gap-3 h-12 text-base text-[var(--primary)] font-semibold border border-[var(--primary)] bg-[var(--surface)] hover:bg-[var(--tint-primary-weak)] transition-all"
            >
              체험 계정으로 시작하기
            </Button>
          </>
        ) : (
          <div className="space-y-4 motion-safe:animate-[playModalRise_0.3s_ease-out_both]">
            <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
              <FormField label="이메일" htmlFor="teacher-auth-email">
                <Input
                  id="teacher-auth-email"
                  type="email"
                  placeholder="이메일"
                  value={email}
                  readOnly
                  className="bg-[var(--tint-primary-weak)] cursor-not-allowed opacity-80"
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
                  readOnly
                  className="bg-[var(--tint-primary-weak)] cursor-not-allowed opacity-80 text-xl placeholder:text-base"
                  required
                  autoComplete="current-password"
                />
              </FormField>
              <div className="flex flex-col gap-2 pt-2">
                <Button type="submit" disabled={isLoading} className="w-full h-11">
                  로그인하기
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowMasterForm(false)}
                  disabled={isLoading}
                  className="w-full h-10 text-sm text-[var(--muted-foreground)] hover:bg-[var(--tint-primary-weak)]"
                >
                  다른 로그인 방법 선택
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
}

