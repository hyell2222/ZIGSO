import Link from "next/link";
import { BookOpen, Map, Users2 } from "lucide-react";

import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const bulletClass =
  "flex flex-col items-center gap-2 rounded-xl border border-[var(--border)]/90 bg-[color-mix(in_srgb,var(--surface)_75%,var(--background))] px-4 py-5 text-center shadow-[var(--elevation-sm)] sm:items-start sm:text-left";

/**
 * 랜딩 설계 요약
 * - 주 사용층(교사·동아리 운영자): “지금 시작하기” → 로그인, 계정이 없으면 상단/랜딩에서 회원가입.
 * - 학생: URL에 코드가 있어야 세션에 입장 가능 → `/play`는 코드 입력(기존 Blackout)으로 연결. 랜딩·네비에 “학생 입장”을 별도로 두어 역할이 섞이지 않게 함.
 */
export function HomeLanding() {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[var(--background)]"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 50% -20%, color-mix(in srgb, var(--primary) 8%, transparent), transparent),
            linear-gradient(180deg, var(--surface) 0%, var(--background) 35%, var(--background) 100%)
          `,
        }}
        aria-hidden
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center md:py-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
          협동 추리 · 교실 멀티플레이
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-[var(--primary)] sm:text-6xl">
          MYSTERY CLUB
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-base leading-relaxed text-[var(--muted-foreground)]">
          팀을 맞추고 맵을 돌아다니며 단서를 수집하고, 토론 끝에 범인을 지목하세요. 교사는 사건·세션을
          설계하고 수업 시간에 바로 띄울 수 있어요.
        </p>

        <ul className="mt-10 grid gap-3 sm:grid-cols-3 sm:gap-4">
          <li className={bulletClass}>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--tint-accent-weak)] text-[var(--primary)]">
              <BookOpen className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--mystery)]">사건 설계</p>
              <p className="mt-1 text-xs leading-snug text-[var(--muted-foreground)]">
                용의자·구역·단서·정답을 구성해 한 번에 세션을 엽니다.
              </p>
            </div>
          </li>
          <li className={bulletClass}>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--tint-accent-weak)] text-[var(--primary)]">
              <Map className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--mystery)]">현장 조사</p>
              <p className="mt-1 text-xs leading-snug text-[var(--muted-foreground)]">
                팀·역할·순찰 구역이 배정되고, 맵에서 발견한 단서는 팀과 공유됩니다.
              </p>
            </div>
          </li>
          <li className={bulletClass}>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--tint-accent-weak)] text-[var(--primary)]">
              <Users2 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--mystery)]">최종 보고</p>
              <p className="mt-1 text-xs leading-snug text-[var(--muted-foreground)]">
                팀 단위로 범인·수법·동기를 제출하고, 정답과 비교해 결론을 나눕니다.
              </p>
            </div>
          </li>
        </ul>

        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:mt-12 sm:flex-row sm:items-center">
          <Link
            href={ROUTES.admin.login}
            className={cn(
              "inline-flex h-12 min-w-[200px] items-center justify-center rounded-md px-8 text-base font-semibold",
              "bg-[var(--primary)] text-[var(--on-primary)] shadow-md transition hover:brightness-95",
            )}
          >
            지금 시작하기
          </Link>
          <Link
            href={ROUTES.play}
            className={cn(
              "inline-flex h-12 min-w-[200px] items-center justify-center rounded-md border-2 border-[var(--mystery)]/35",
              "bg-[color-mix(in_srgb,var(--surface)_60%,var(--background))] px-8 text-base font-semibold text-[var(--mystery)]",
              "transition hover:border-[var(--mystery)]/55 hover:bg-[var(--surface)]",
            )}
          >
            학생으로 입장
          </Link>
        </div>
        <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">
          학생은 담당 교사가 알려 주는 <strong className="font-semibold text-[var(--foreground)]">사건 코드</strong>
          가 필요해요.
        </p>
      </div>
    </div>
  );
}
