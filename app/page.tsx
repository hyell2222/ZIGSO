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
        <section className="rounded-xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top,#0f3650_0%,#020617_45%,#020617_100%)] p-8">
          <form
            className="text-slate-300 flex flex-col gap-8 max-w-md mx-auto"
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
              className="w-full h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
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
