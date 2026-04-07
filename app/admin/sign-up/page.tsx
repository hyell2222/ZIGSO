"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AdminAuthForm } from "@/app/admin/components/admin-auth-form";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { TopNav } from "@/components/layout/top-nav";

export default function AdminSignUpPage() {
  const router = useRouter();

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      if (!hasSupabaseEnv) {
        throw new Error(
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.",
        );
      }
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    },
    onSuccess: () => {
      router.replace(ROUTES.admin.signIn);
    },
  });

  useEffect(() => {
    if (sessionQuery.isLoading) return;
    if (sessionQuery.data) router.replace(ROUTES.admin.root);
  }, [router, sessionQuery.data, sessionQuery.isLoading]);

  const message =
    signUpMutation.error?.message ??
    (!hasSupabaseEnv
      ? "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env."
      : null) ??
    (signUpMutation.isSuccess
      ? "Sign up successful. Check your email verification settings."
      : null);

  return (
    <>
      <TopNav />
      <main className="flex items-center justify-center py-40">
        <AdminAuthForm
          mode="sign-up"
          onSubmit={(email, password) => {
            signUpMutation.mutate({ email, password });
            return Promise.resolve();
          }}
          isLoading={signUpMutation.isPending || !hasSupabaseEnv}
          message={message}
          switchHref={ROUTES.admin.signIn}
          switchPrompt="Already have an account?"
          switchLabel="Sign in"
        />
      </main>
    </>
  );
}
