import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";

const dungGeunMo = localFont({
  src: "../public/assets/DungGeunMo.otf",
  variable: "--font-dunggeunmo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mystery Club",
  description: "비밀 탐정 동아리 협동 추리 — 팀 기반 미스터리",
  icons: {
    icon: "/window.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${dungGeunMo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
