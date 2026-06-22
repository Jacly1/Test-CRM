'use client';

import { FormEvent, useEffect, useState } from 'react';
import Protected from '@/components/Protected';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { toastSuccess } from '@/lib/swal';
import { SessionUser } from '@/lib/types';

function ProfileInner() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isGoogle = user?.provider === 'google';

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    setError('');
    setBusy(true);
    const body: any = { name };
    if (newPassword) {
      body.newPassword = newPassword;
      if (currentPassword) body.currentPassword = currentPassword;
    }
    try {
      await api<SessionUser>('/profile', { method: 'PATCH', body: JSON.stringify(body) });
      await refresh();
      setCurrentPassword('');
      setNewPassword('');
      setMsg('Profil berhasil diperbarui.');
      toastSuccess('Profil berhasil diperbarui.');
    } catch (err: any) {
      setError(err.message ?? 'Gagal memperbarui profil.');
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;
  const input = 'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm';

  return (
    <div className="mx-auto max-w-2xl">
      <BackButton className="mb-4" />
      <h1 className="mb-5 text-xl font-semibold">Profil Saya</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-white p-5 text-sm">
        <div>
          <p className="text-xs uppercase text-gray-400">Email</p>
          <p className="text-gray-800">{user.email}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-400">Role</p>
          <p className="text-gray-800">{user.roleName ?? 'Tanpa role'}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-400">Metode login</p>
          <p className="text-gray-800">{isGoogle ? 'Google' : 'Email & Password'}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-400">Jumlah hak akses</p>
          <p className="text-gray-800">{user.permissions.length}</p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-medium">Ubah profil</h2>
        {msg && <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</div>}
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Nama</span>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <div className="border-t border-gray-100 pt-4">
          <p className="mb-2 text-sm font-medium text-gray-700">Ganti password (opsional)</p>
          {!isGoogle && (
            <label className="mb-3 block">
              <span className="text-sm text-gray-600">Password saat ini</span>
              <input
                type="password"
                className={input}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
          )}
          <label className="block">
            <span className="text-sm text-gray-600">Password baru</span>
            <input
              type="password"
              className={input}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              autoComplete="new-password"
            />
          </label>
        </div>

        <button
          disabled={busy}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Menyimpan…' : 'Simpan'}
        </button>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Protected>
      <ProfileInner />
    </Protected>
  );
}
