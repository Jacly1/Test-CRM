'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function OAuthCallbackPage() {
  const { loginWithToken } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState('');
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const token = params.get('token');
    if (!token) {
      setError('Token tidak ditemukan.');
      return;
    }
    loginWithToken(token).catch(() => {
      setError('Gagal menyelesaikan login Google.');
    });
  }, [params, loginWithToken]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
      {error ? (
        <div className="space-y-3 text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => router.replace('/login')}
            className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            Kembali ke login
          </button>
        </div>
      ) : (
        'Menyelesaikan login…'
      )}
    </div>
  );
}
