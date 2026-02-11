'use client';

import { Navigation } from "@/components/Navigation";
import { Providers } from "@/components/Providers";
import { Toaster } from "sonner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <Navigation />
      <main className="pt-16 min-h-screen">
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </Providers>
  );
}
