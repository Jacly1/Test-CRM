'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Navbar from './Navbar';

interface Props {
  children: ReactNode;
  require?: string | string[];
}

export default function Protected({ children, require }: Props) {
  const { user, loading, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Memuat…</div>;
  }
  if (!user) return null;

  const allowed = !require || hasPermission(require);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {allowed ? (
          children
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            Anda tidak memiliki hak akses untuk halaman ini.
          </div>
        )}
      </main>
    </div>
  );
}
