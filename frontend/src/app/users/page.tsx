'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Protected from '@/components/Protected';
import BackButton from '@/components/BackButton';
import { EditIcon, TrashIcon } from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { api, formatDate } from '@/lib/api';
import { confirmAction, toastSuccess, alertError } from '@/lib/swal';
import { ManagedUser, Role } from '@/lib/types';

interface FormState {
  name: string;
  email: string;
  password: string;
  roleId: string;
  isActive: boolean;
}

const EMPTY: FormState = { name: '', email: '', password: '', roleId: '', isActive: true };

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-green-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function UsersInner() {
  const { user, hasPermission } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canCreate = hasPermission('user.create');
  const canUpdate = hasPermission('user.update');
  const canDelete = hasPermission('user.delete');

  // Role Admin (isSystem) terlindungi: tidak bisa diberikan, dan user-nya tidak bisa diubah/hapus.
  const assignableRoles = roles.filter((r) => !r.isSystem);
  const systemRoleIds = new Set(roles.filter((r) => r.isSystem).map((r) => r.id));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([api<ManagedUser[]>('/users'), api<Role[]>('/roles')]);
      setUsers(u);
      setRoles(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setForm(EMPTY);
    setEditingId(null);
    setError('');
    setShowForm(false);
  }

  function startCreate() {
    setForm({ ...EMPTY, roleId: assignableRoles[0]?.id ?? '' });
    setEditingId(null);
    setError('');
    setShowForm(true);
  }

  function startEdit(u: ManagedUser) {
    setForm({ name: u.name, email: u.email, password: '', roleId: u.roleId ?? assignableRoles[0]?.id ?? '', isActive: u.isActive ?? true });
    setEditingId(u.id);
    setError('');
    setShowForm(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (editingId) {
        const body: any = { name: form.name, email: form.email, roleId: form.roleId, isActive: form.isActive };
        if (form.password) body.password = form.password;
        await api(`/users/${editingId}`, { method: 'PATCH', body: JSON.stringify(body) });
        toastSuccess('User diperbarui.');
      } else {
        await api('/users', {
          method: 'POST',
          body: JSON.stringify({ name: form.name, email: form.email, password: form.password, roleId: form.roleId }),
        });
        toastSuccess('User berhasil dibuat.');
      }
      resetForm();
      load();
    } catch (err: any) {
      setError(err.message ?? 'Gagal menyimpan user.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, name: string) {
    const ok = await confirmAction({
      title: 'Hapus user ini?',
      text: `User "${name}" akan dihapus permanen.`,
      danger: true,
      confirmText: 'Ya, hapus',
    });
    if (!ok) return;
    try {
      await api(`/users/${id}`, { method: 'DELETE' });
      load();
      toastSuccess('User dihapus.');
    } catch (err: any) {
      await alertError(err.message ?? 'Gagal menghapus.');
    }
  }

  const input = 'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const req = <span className="text-red-500"> *</span>;

  return (
    <div>
      <BackButton className="mb-4" />
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kelola User</h1>
        {canCreate && (
          <button
            onClick={showForm && !editingId ? resetForm : startCreate}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            {showForm && !editingId ? 'Tutup' : '+ User baru'}
          </button>
        )}
      </div>

      {showForm && (canCreate || editingId) && (
        <form onSubmit={submit} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-medium">{editingId ? 'Ubah user' : 'User baru'}</h2>
          {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Nama{req}</span>
              <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email{req}</span>
              <input type="email" className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Password{editingId ? ' (kosongkan jika tidak diubah)' : req}
              </span>
              <input
                type="password"
                className={input}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={6}
                required={!editingId}
                placeholder={editingId ? '••••••' : ''}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Role{req}</span>
              <select className={input} value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} required>
                {assignableRoles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
            {editingId && editingId !== user?.id && (
              <div className="block">
                <span className="text-sm font-medium text-gray-700">Status akun</span>
                <div className="mt-2 flex items-center gap-3">
                  <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
                  <span className={`text-sm font-medium ${form.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                    {form.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-5 flex gap-2">
            <button disabled={busy} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
              {busy ? 'Menyimpan…' : editingId ? 'Simpan perubahan' : 'Buat user'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Dibuat</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Memuat…</td></tr>
            ) : (
              users.map((u) => {
                const active = u.isActive ?? true;
                const isSelf = u.id === user?.id;
                const protectedAdmin = u.roleId ? systemRoleIds.has(u.roleId) : false;
                return (
                  <tr key={u.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium">
                      {u.name}
                      {isSelf && <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">Anda</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-700">{u.role?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                        {active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.createdAt ? formatDate(u.createdAt) : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        {protectedAdmin ? (
                          <span className="text-xs text-gray-400">Terlindungi</span>
                        ) : (
                          <>
                            {canUpdate && (
                              <button
                                onClick={() => startEdit(u)}
                                title="Ubah"
                                aria-label="Ubah"
                                className="rounded-md p-1.5 text-blue-600 transition hover:bg-blue-50"
                              >
                                <EditIcon />
                              </button>
                            )}
                            {canDelete && !isSelf && (
                              <button
                                onClick={() => remove(u.id, u.name)}
                                title="Hapus"
                                aria-label="Hapus"
                                className="rounded-md p-1.5 text-red-600 transition hover:bg-red-50"
                              >
                                <TrashIcon />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Protected require="user.read">
      <UsersInner />
    </Protected>
  );
}
