'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { user, loading, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else {
      router.replace(hasPermission('dashboard.read') ? '/dashboard' : '/profile');
    }
  }, [user, loading, router, hasPermission]);

  return <div className="p-8 text-center text-gray-500">Memuat…</div>;
}
