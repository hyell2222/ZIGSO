import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";

const dungGeunMo = localFont({
  src: "../assets/DungGeunMo.otf",
  variable: "--font-dunggeunmo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CODEZERO",
  description: "Team-based classroom cyber mystery platform",
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
      lang="en"
      className={`${dungGeunMo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
