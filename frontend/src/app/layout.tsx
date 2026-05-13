import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundaryClient } from "@/components/ErrorBoundaryClient";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ui/feedback/ToastProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DevHire Cloud",
  description: "Microservices recruitment platform portfolio frontend"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <ThemeProvider>
          <ToastProvider>
            <ErrorBoundaryClient>
              <AppShell>{children}</AppShell>
            </ErrorBoundaryClient>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
