'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { BrandProvider } from '@/context/BrandContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <BrandProvider>
        {children}
      </BrandProvider>
    </AuthProvider>
  );
}
