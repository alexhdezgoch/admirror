import type { Metadata } from "next";
import { Navigation } from "@/components/Navigation";
import { Providers } from "@/components/Providers";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdMirror - Competitive Intelligence for Meta Ads",
  description: "Analyze competitor ads, discover winning patterns, and get actionable insights for your creative team.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 antialiased">
        <Providers>
          <Navigation />
          <main className="pt-16 min-h-screen">
            {children}
          </main>
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
