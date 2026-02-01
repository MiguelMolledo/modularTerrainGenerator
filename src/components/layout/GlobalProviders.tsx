'use client';

import { AIChatDialog } from '@/components/chat/AIChatDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function GlobalProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
      <AIChatDialog />
    </ErrorBoundary>
  );
}
