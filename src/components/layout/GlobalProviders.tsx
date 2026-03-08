'use client';

import { AIChatDialog } from '@/components/chat/AIChatDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/hooks/useAuth';

export function GlobalProviders({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();

  return (
    <ErrorBoundary>
      {children}
      {profile?.ai_enabled && <AIChatDialog />}
    </ErrorBoundary>
  );
}
