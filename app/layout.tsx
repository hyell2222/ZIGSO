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
  title: "School Lunch Rush",
  description: "급식실 협동 영어 타이쿤 — School Lunch Rush",
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
