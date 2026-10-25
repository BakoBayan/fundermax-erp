'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/?admin=true');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-300">Loading Bako&apos;s Admin Panel...</p>
      </div>
    </div>
  );
}
