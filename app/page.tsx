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
        <section className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-gradient-to-b from-[var(--surface)] to-[var(--background)] p-8 shadow-sm">
          <div className="mb-6 space-y-3 text-left">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-[var(--mystery)]">
              사건 브리핑 · 동아리원 전용
            </p>
            <h1 className="text-base font-semibold leading-snug text-[var(--mystery)]">
              사건이 배정됐다
            </h1>
            <div className="space-y-2 text-sm leading-relaxed text-[var(--foreground)]">
              <p>
                당신은 학교의 비밀 탐정 동아리{" "}
                <span className="font-semibold text-[var(--primary)]">Mystery Club</span>의
                일원이다. 사건 의뢰가 들어왔다는 연락이 방금 도착했다—부활동 시간
                이후에도 열어 둔 동아리실 문턱에, 익명으로 남겨진 짧은 쪽지와
                함께.
              </p>
              <p className="text-[var(--muted-foreground)]">
                전달받은{" "}
                <strong className="font-semibold text-[var(--foreground)]">입장 코드</strong>로
                같은 팀이 모인 브리핑(사건장)에 들어갈 수 있다. 공백 없이 입력하고,
                알파벳은 대·소문자 모두 된다.
              </p>
            </div>
          </div>
          <form
            className="mx-auto flex max-w-md flex-col gap-6 text-[var(--foreground)]"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const code = joinCode.trim().toUpperCase();
              if (!code) return;
              router.push(`/play?code=${encodeURIComponent(code)}`);
            }}
          >
            <input
              type="text"
              placeholder="입장 코드"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--mystery)] focus:outline-none"
              required
            />
            <Button className="w-full" type="submit">
              입장
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
