"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AdminAuthFormProps = {
  mode: "sign-in" | "sign-up";
  onSubmit: (email: string, password: string) => Promise<void>;
  isLoading?: boolean;
  message?: string | null;
  switchHref: string;
  switchLabel: string;
  switchPrompt: string;
};

export function AdminAuthForm({
  mode,
  onSubmit,
  isLoading,
  message,
  switchHref,
  switchLabel,
  switchPrompt,
}: AdminAuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await onSubmit(email, password);
    } catch {
      // Mutation errors are surfaced via React Query state (`message` prop).
      // Catch here to avoid unhandled promise rejection in browser console.
    }
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>{mode === "sign-in" ? "Sign In" : "Sign Up"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-2" onSubmit={(event) => void handleSubmit(event)}>
          <Input
            type="email"
            placeholder="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <div className="flex justify-center pt-6">
            <Button type="submit" disabled={isLoading}>
              {mode === "sign-in" ? "Sign In" : "Sign Up"}
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
      </CardContent>
    </Card>
  );
}
