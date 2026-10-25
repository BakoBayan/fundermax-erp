'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WarehouseRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <span>Opening Operations Platform...</span>
      </div>
    </div>
  );
}
