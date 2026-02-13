'use client';

import { useState } from 'react';
import { AlertTriangle, CreditCard, Loader2 } from 'lucide-react';

export function PaymentFailedScreen() {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdatePayment = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95">
      <div className="max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Payment Failed</h1>
        <p className="text-slate-400 mb-8">
          Your last payment didn&apos;t go through. Update your payment method to continue using the app.
        </p>
        <button
          onClick={handleUpdatePayment}
          disabled={isLoading}
          className="w-full py-4 px-6 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Opening billing portal...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Update Payment Method
            </>
          )}
        </button>
      </div>
    </div>
  );
}
