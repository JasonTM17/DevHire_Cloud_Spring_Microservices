import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ErrorBoundaryClient } from "@/components/ErrorBoundaryClient";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ui/feedback/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevHire Cloud",
  description: "Microservices recruitment platform portfolio frontend"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
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
