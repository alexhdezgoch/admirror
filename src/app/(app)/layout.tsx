'use client';

import { Navigation } from "@/components/Navigation";
import { Providers } from "@/components/Providers";
import { PaymentFailedScreen } from "@/components/PaymentFailedScreen";
import { useBrandContext } from "@/context/BrandContext";
import { Toaster } from "sonner";

function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { subscription, loading } = useBrandContext();

  if (!loading && subscription.status === 'past_due') {
    return <PaymentFailedScreen />;
  }

  return <>{children}</>;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <Navigation />
      <main className="pt-16 min-h-screen">
        <SubscriptionGate>
          {children}
        </SubscriptionGate>
      </main>
      <Toaster position="top-right" richColors />
    </Providers>
  );
}
