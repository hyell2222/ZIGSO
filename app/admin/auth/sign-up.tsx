"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AdminAuthForm } from "@/app/admin/auth/components/admin-auth-form";
import { SupabaseConfigNotice } from "@/app/admin/auth/components/supabase-config-notice";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

export default function AdminSignUpPage() {
  const router = useRouter();

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    enabled: hasSupabaseEnv,
  });

  const signUpMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    },
    onSuccess: () => {
      router.replace("/admin/sign-in");
    },
  });

  useEffect(() => {
    if (!hasSupabaseEnv || sessionQuery.isLoading) return;
    if (sessionQuery.data) router.replace("/admin");
  }, [router, sessionQuery.data, sessionQuery.isLoading]);

  if (!hasSupabaseEnv) return <SupabaseConfigNotice />;

  const message =
    signUpMutation.error?.message ??
    (signUpMutation.isSuccess
      ? "Sign up successful. Check your email verification settings."
      : null);

  return (
    <AdminAuthForm
      mode="sign-up"
      onSubmit={async (email, password) => {
        await signUpMutation.mutateAsync({ email, password });
      }}
      isLoading={signUpMutation.isPending}
      message={message}
      switchHref="/admin/sign-in"
      switchPrompt="Already have an account?"
      switchLabel="Sign in"
    />
  );
}
