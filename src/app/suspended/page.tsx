'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SuspendedPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 p-8 text-center">
        <span className="text-6xl">🚫</span>
        <h1 className="text-2xl font-bold text-foreground">
          Account Suspended
        </h1>
        <p className="text-muted-foreground max-w-md">
          Your account has been suspended. If you believe this is an error,
          please contact an administrator.
        </p>
        <button
          onClick={handleSignOut}
          className="rounded-lg bg-secondary px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
