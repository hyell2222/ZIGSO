"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="flex justify-center items-center py-40">
        <section className="rounded-xl border border-[var(--border)] bg-[radial-gradient(circle_at_top,rgba(123,14,14,0.38)_0%,rgba(36,40,43,0.94)_45%,rgba(15,17,19,1)_100%)] p-8">
          <form
            className="mx-auto flex max-w-md flex-col gap-8 text-[var(--foreground)]"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const code = joinCode.trim().toUpperCase();
              if (!code) return;
              router.push(`/play?code=${encodeURIComponent(code)}`);
            }}
          >
            <input
              type="text"
              placeholder="code number"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:outline-none"
              required
            />
            <Button className="w-full" type="submit">
              Enter
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
