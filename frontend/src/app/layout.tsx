import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toxic Review",
  description: "AI-powered GitHub PR code review",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Header />
          <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
