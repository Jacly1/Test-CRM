'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@solusiklik.id');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message ?? 'Gagal login.');
    } finally {
      setLoading(false);
    }
  }

  function loginGoogle() {
    window.location.href = `${API_URL}/auth/google`;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h1 className="mb-1 text-xl font-semibold">CRM Solusi Klik</h1>
        <p className="mb-5 text-sm text-gray-500">Masuk untuk melanjutkan</p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <label className="mb-3 block">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </label>

        <label className="mb-4 block">
          <span className="text-sm font-medium text-gray-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Memproses…' : 'Masuk'}
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          atau
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={loginGoogle}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 3.5 29.6 1.5 24 1.5 11.6 1.5 1.5 11.6 1.5 24S11.6 46.5 24 46.5 46.5 36.4 46.5 24c0-1.2-.1-2.3-.3-3.5z" />
            <path fill="#FF3D00" d="M4.3 13.7l6.6 4.8C12.7 14.1 17.9 11 24 11c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 3.5 29.6 1.5 24 1.5 16 1.5 9.1 6 4.3 13.7z" />
            <path fill="#4CAF50" d="M24 46.5c5.3 0 10.2-2 13.8-5.3l-6.4-5.4C29.3 37.5 26.8 38.5 24 38.5c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9.1 42 16 46.5 24 46.5z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6.4 5.4C41.9 35.7 46.5 30.6 46.5 24c0-1.2-.1-2.3-.3-3.5z" />
          </svg>
          Masuk dengan Google
        </button>

        <div className="mt-5 rounded-md bg-gray-50 p-3 text-xs text-gray-500">
          Akun demo (password: <code>password123</code>):<br />
          admin@solusiklik.id · sales@solusiklik.id · finance@solusiklik.id
        </div>
      </form>
    </div>
  );
}
