"use client";

import { supabase } from "@/lib/supabase";

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  // #region agent log

  fetch("http://127.0.0.1:7749/ingest/bf6ab18c-c394-4192-9205-66b8beb594f8", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "55cc55",
    },
    body: JSON.stringify({
      sessionId: "55cc55",
      runId: "empty-scenarios-pre-fix",
      hypothesisId: "H1",
      location: "lib/api/auth.ts:6",
      message: "getCurrentSession result",
      data: {
        hasSession: Boolean(data.session),
        userId: data.session?.user?.id ?? null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return data.session;
}

export async function signInTeacher(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpTeacher(email: string, password: string) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOutTeacher() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
