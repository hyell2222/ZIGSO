"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AdminAuthForm } from "@/app/admin/components/admin-auth-form";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabase";
import { TopNav } from "@/components/layout/top-nav";

export default function AdminSignUpPage() {
  const router = useRouter();

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
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
          isLoading={signUpMutation.isPending}
          message={message}
          switchHref={ROUTES.admin.signIn}
          switchPrompt="Already have an account?"
          switchLabel="Sign in"
        />
      </main>
    </>
  );
}
