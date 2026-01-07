import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/providers/theme-provider";
import { SWRProvider } from "@/providers/swr-provider";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'SaaS Platform',
  description: 'Multi-tenant SaaS Platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider defaultMode="system">
          <SWRProvider>
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              duration={4000}
            />
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
