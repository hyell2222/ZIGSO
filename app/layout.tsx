import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";

const kerisBaeum = localFont({
  src: [
    {
      path: "../public/assets/KERISBAEUM_L.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/assets/KERISBAEUM_R.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/assets/KERISBAEUM_B.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/assets/KERISBAEUM_EB.otf",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-kerisbaeum",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jigsaw",
  description: `직소 모형 기반 온라인 협동학습 게임`,
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
      className={`${kerisBaeum.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-[var(--foreground)]">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
