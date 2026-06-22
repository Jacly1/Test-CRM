'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Protected from '@/components/Protected';
import BackButton from '@/components/BackButton';
import { EditIcon, TrashIcon } from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { confirmAction, toastSuccess, alertError } from '@/lib/swal';
import { PermissionDef, Role } from '@/lib/types';

const FEATURE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  lead: 'Kelola Lead',
  spk: 'Kelola SPK',
  user: 'Kelola User',
  role: 'Kelola Role',
};

function RolesInner() {
  const { hasPermission, refresh } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<PermissionDef[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canCreate = hasPermission('role.create');
  const canUpdate = hasPermission('role.update');
  const canDelete = hasPermission('role.delete');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([
        api<Role[]>('/roles'),
        api<PermissionDef[]>('/roles/permissions'),
      ]);
      setRoles(r);
      setCatalog(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map: Record<string, PermissionDef[]> = {};
    for (const p of catalog) {
      (map[p.feature] ??= []).push(p);
    }
    return map;
  }, [catalog]);

  function resetForm() {
    setEditingId(null);
    setName('');
    setDescription('');
    setSelected(new Set());
    setError('');
    setShowForm(false);
  }

  function startCreate() {
    resetForm();
    setShowForm(true);
  }

  function startEdit(role: Role) {
    setEditingId(role.id);
    setName(role.name);
    setDescription(role.description ?? '');
    setSelected(new Set(role.permissionKeys));
    setError('');
    setShowForm(true);
  }

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleFeature(feature: string, keys: string[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = keys.every((k) => next.has(k));
      keys.forEach((k) => (allOn ? next.delete(k) : next.add(k)));
      return next;
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (selected.size === 0) {
      setError('Pilih minimal satu hak akses.');
      return;
    }
    setBusy(true);
    const body = JSON.stringify({
      name,
      description,
      permissionKeys: Array.from(selected),
    });
    try {
      if (editingId) {
        await api(`/roles/${editingId}`, { method: 'PATCH', body });
      } else {
        await api('/roles', { method: 'POST', body });
      }
      resetForm();
      await load();
      await refresh(); // own permissions may have changed
      toastSuccess(editingId ? 'Role diperbarui.' : 'Role dibuat.');
    } catch (err: any) {
      setError(err.message ?? 'Gagal menyimpan role.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(role: Role) {
    const ok = await confirmAction({
      title: `Hapus role "${role.name}"?`,
      text: 'Role yang sedang dipakai user tidak dapat dihapus.',
      danger: true,
      confirmText: 'Ya, hapus',
    });
    if (!ok) return;
    try {
      await api(`/roles/${role.id}`, { method: 'DELETE' });
      await load();
      toastSuccess('Role dihapus.');
    } catch (err: any) {
      await alertError(err.message ?? 'Gagal menghapus role.');
    }
  }

  const input = 'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm';

  return (
    <div>
      <BackButton className="mb-4" />
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kelola Role &amp; Hak Akses</h1>
        {canCreate && (
          <button
            onClick={showForm && !editingId ? resetForm : startCreate}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showForm && !editingId ? 'Tutup' : '+ Role baru'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-medium">{editingId ? 'Ubah role' : 'Role baru'}</h2>
          {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Nama role</span>
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Deskripsi</span>
              <input className={input} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
          </div>

          <p className="mb-2 mt-5 text-sm font-medium text-gray-700">Hak akses</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Object.entries(grouped).map(([feature, perms]) => {
              const keys = perms.map((p) => p.key);
              const allOn = keys.every((k) => selected.has(k));
              return (
                <div key={feature} className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">
                      {FEATURE_LABELS[feature] ?? feature}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleFeature(feature, keys)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {allOn ? 'Kosongkan' : 'Pilih semua'}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {perms.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={selected.has(p.key)}
                          onChange={() => toggle(p.key)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        {p.description}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex gap-2">
            <button
              disabled={busy}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? 'Menyimpan…' : editingId ? 'Simpan perubahan' : 'Buat role'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Deskripsi</th>
              <th className="px-4 py-3">Hak akses</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Memuat…</td></tr>
            ) : (
              roles.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3 font-medium">
                    {r.name}
                    {r.isSystem && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">sistem</span>}
                    {r.isDefault && <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">default</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.description}</td>
                  <td className="px-4 py-3 text-gray-500">{r.permissionKeys.length} izin</td>
                  <td className="px-4 py-3 text-gray-600">{r.userCount}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {r.isSystem ? (
                        <span className="text-xs text-gray-400">Terlindungi</span>
                      ) : (
                        <>
                          {canUpdate && (
                            <button onClick={() => startEdit(r)} title="Ubah" aria-label="Ubah" className="rounded-md p-1.5 text-blue-600 transition hover:bg-blue-50">
                              <EditIcon />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => remove(r)} title="Hapus" aria-label="Hapus" className="rounded-md p-1.5 text-red-600 transition hover:bg-red-50">
                              <TrashIcon />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RolesPage() {
  return (
    <Protected require="role.read">
      <RolesInner />
    </Protected>
  );
}
