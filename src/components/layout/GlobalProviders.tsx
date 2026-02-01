'use client';

import { AIChatDialog } from '@/components/chat/AIChatDialog';

export function GlobalProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AIChatDialog />
    </>
  );
}
