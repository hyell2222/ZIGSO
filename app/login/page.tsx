"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { TeacherAuthForm } from "@/components/teacher/teacher-auth-form";
import { getCurrentSession, signInTeacher } from "@/lib/api/auth";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth/use-require-teacher-session";
import { getKoreanAuthErrorMessage } from "@/lib/auth/errors";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";
import { TopNav } from "@/components/layout/top-nav";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      return getCurrentSession();
    },
  });

  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      if (!hasSupabaseEnv) {
        throw new Error(
          "Supabase가 설정되지 않았습니다. .env 파일에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정해 주세요.",
        );
      }
      await signInTeacher(email, password);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AUTH_SESSION_QUERY_KEY });
      router.replace(ROUTES.activities);
    },
    onError: (error) => {
      toast.error(getKoreanAuthErrorMessage(error));
    },
  });

  useEffect(() => {
    if (sessionQuery.isLoading) return;
    if (sessionQuery.isFetching && !sessionQuery.data) return;
    if (sessionQuery.data) router.replace(ROUTES.activities);
  }, [router, sessionQuery.data, sessionQuery.isLoading, sessionQuery.isFetching]);

  return (
    <>
      <TopNav />
      <main className="flex flex-1 items-center justify-center px-4 py-20 sm:px-6 sm:py-24">
        <TeacherAuthForm
          mode="sign-in"
          onSubmit={(email, password) => {
            signInMutation.mutate({ email, password });
            return Promise.resolve();
          }}
          isLoading={signInMutation.isPending}
          switchHref={ROUTES.signUp}
          switchPrompt="계정이 없으신가요?"
          switchLabel="회원가입"
        />
      </main>
    </>
  );
}
