import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";
import { AuthGate } from "@/components/auth/auth-gate";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "RTTA",
  applicationName: "RTTA",
  description: "Không gian dịch trực tiếp và nghiên cứu cuộc họp bằng tiếng Việt.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  const runtimeConfig = {
    apiUrl: process.env.RTTA_PUBLIC_API_URL
      ?? process.env.NEXT_PUBLIC_RTTA_API_URL
      ?? "http://localhost:8080",
    liveWebSocketUrl: process.env.RTTA_PUBLIC_LIVE_WS_URL
      ?? process.env.NEXT_PUBLIC_RTTA_LIVE_WS_URL
      ?? "ws://localhost:8080/ws/live",
  };
  const serializedConfig = JSON.stringify(runtimeConfig).replaceAll("<", "\\u003c");
  return (
    <html lang="vi">
      <body className={`${inter.variable} ${merriweather.variable}`}>
        <script dangerouslySetInnerHTML={{ __html: `window.__RTTA_CONFIG__=${serializedConfig}` }} />
        <AuthGate>
          <TooltipProvider delayDuration={250}>
            <AppShell>{children}</AppShell>
          </TooltipProvider>
        </AuthGate>
      </body>
    </html>
  );
}
