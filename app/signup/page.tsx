"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { TeacherAuthForm } from "@/components/teacher/teacher-auth-form";
import { getCurrentSession, signUpTeacher } from "@/lib/api/auth";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth-session-query";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";
import { TopNav } from "@/components/layout/top-nav";

export default function SignUpPage() {
  const router = useRouter();

  const sessionQuery = useQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      return getCurrentSession();
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      if (!hasSupabaseEnv) {
        throw new Error(
          "Supabase가 설정되지 않았습니다. .env에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 넣어 주세요.",
        );
      }
      await signUpTeacher(email, password);
    },
    onSuccess: () => {
      router.replace(ROUTES.login);
    },
  });

  useEffect(() => {
    if (sessionQuery.isLoading) return;
    if (sessionQuery.isFetching && !sessionQuery.data) return;
    if (sessionQuery.data) router.replace(ROUTES.cases);
  }, [router, sessionQuery.data, sessionQuery.isLoading, sessionQuery.isFetching]);

  const message =
    signUpMutation.error?.message ??
    (!hasSupabaseEnv
      ? "Supabase가 설정되지 않았습니다. .env에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 추가하세요."
      : null) ??
    (signUpMutation.isSuccess
      ? "회원가입 요청이 완료되었습니다. 이메일 인증 설정을 확인해 주세요."
      : null);

  return (
    <>
      <TopNav />
      <main className="flex items-center justify-center py-32">
        <TeacherAuthForm
          mode="sign-up"
          onSubmit={(email, password) => {
            signUpMutation.mutate({ email, password });
            return Promise.resolve();
          }}
          isLoading={signUpMutation.isPending || !hasSupabaseEnv}
          message={message}
          switchHref={ROUTES.login}
          switchPrompt="이미 계정이 있으신가요?"
          switchLabel="로그인"
        />
      </main>
    </>
  );
}
