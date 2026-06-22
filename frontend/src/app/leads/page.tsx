'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Protected from '@/components/Protected';
import StatusBadge from '@/components/StatusBadge';
import Pagination from '@/components/Pagination';
import BackButton from '@/components/BackButton';
import LeadForm, { LeadFormValues } from '@/components/LeadForm';
import { EditIcon, TrashIcon, StatusIcon } from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { api, formatCurrency } from '@/lib/api';
import { confirmAction, toastSuccess, alertError } from '@/lib/swal';
import { Lead, LEAD_STATUSES, LeadStatus, Paginated } from '@/lib/types';

const PIPELINE: LeadStatus[] = LEAD_STATUSES.filter((s) => s !== 'CANCELLED');

function StatusModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!note.trim()) {
      await alertError('Catatan wajib diisi saat mengubah status.');
      return;
    }
    setBusy(true);
    try {
      await api(`/leads/${lead.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note: note.trim() }),
      });
      onSaved();
      onClose();
      await toastSuccess('Status lead diperbarui.');
    } catch (err: any) {
      await alertError(err.message ?? 'Gagal mengubah status.');
    } finally {
      setBusy(false);
    }
  }

  const input =
    'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-1 text-lg font-semibold">Ubah Status Lead</h3>
        <p className="mb-4 text-sm text-gray-500">{lead.companyName}</p>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Status baru</span>
          <select className={input} value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)}>
            {PIPELINE.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label className="mt-3 block">
          <span className="text-sm font-medium text-gray-700">Catatan<span className="text-red-500"> *</span></span>
          <textarea
            className={input}
            rows={3}
            placeholder="Alasan / keterangan perubahan status…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <span className="text-xs text-gray-400">Catatan ini akan tercatat di Riwayat Status.</span>
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
            Batal
          </button>
          <button onClick={save} disabled={busy || !note.trim()} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LeadsInner() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('lead.create');
  const canUpdate = hasPermission('lead.update');
  const canDelete = hasPermission('lead.delete');
  const [result, setResult] = useState<Paginated<Lead> | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | LeadStatus>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusLead, setStatusLead] = useState<Lead | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    params.set('page', String(page));
    params.set('limit', '10');
    try {
      const res = await api<Paginated<Lead>>(`/leads?${params.toString()}`);
      setResult(res);
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function createLead(values: LeadFormValues) {
    await api('/leads', { method: 'POST', body: JSON.stringify(values) });
    setShowForm(false);
    setPage(1);
    load();
    toastSuccess('Lead berhasil dibuat.');
  }

  async function removeLead(lead: Lead) {
    const ok = await confirmAction({
      title: 'Hapus Lead ini?',
      text: `"${lead.companyName}" akan dihapus permanen.`,
      danger: true,
      confirmText: 'Ya, hapus',
    });
    if (!ok) return;
    try {
      await api(`/leads/${lead.id}`, { method: 'DELETE' });
      load();
      toastSuccess('Lead dihapus.');
    } catch (err: any) {
      await alertError(err.message ?? 'Gagal menghapus.');
    }
  }

  const showActions = canUpdate || canDelete;

  return (
    <div>
      <BackButton className="mb-4" />
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Leads</h1>
        {canCreate && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            {showForm ? 'Tutup' : '+ Tambah Lead'}
          </button>
        )}
      </div>

      {showForm && canCreate && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-medium">Lead baru</h2>
          <LeadForm onSubmit={createLead} submitLabel="Buat Lead" hideStatus onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          placeholder="Cari nama perusahaan / kontak…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm sm:max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as LeadStatus | '');
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Semua status</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Perusahaan</th>
              <th className="px-4 py-3">Kontak</th>
              <th className="px-4 py-3">Estimasi</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">SPK</th>
              {showActions && <th className="px-4 py-3 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={showActions ? 6 : 5} className="px-4 py-6 text-center text-gray-400">Memuat…</td></tr>
            ) : result && result.data.length > 0 ? (
              result.data.map((lead) => {
                const hasSpk = !!lead.spk;
                const cancelled = lead.status === 'CANCELLED';
                return (
                  <tr key={lead.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-blue-700 hover:underline">
                        {lead.companyName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.contactName}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(lead.estimatedValue)}</td>
                    <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                    <td className="px-4 py-3 text-gray-500">
                      {lead.spk ? (lead.spk as any).spkNumber ?? '✓' : '—'}
                    </td>
                    {showActions && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          {canUpdate && !hasSpk && !cancelled && (
                            <button
                              onClick={() => setStatusLead(lead)}
                              title="Ubah status"
                              aria-label="Ubah status"
                              className="rounded-md p-1.5 text-amber-600 transition hover:bg-amber-50"
                            >
                              <StatusIcon />
                            </button>
                          )}
                          {canUpdate && (
                            <button
                              onClick={() => router.push(`/leads/${lead.id}`)}
                              title="Edit"
                              aria-label="Edit"
                              className="rounded-md p-1.5 text-blue-600 transition hover:bg-blue-50"
                            >
                              <EditIcon />
                            </button>
                          )}
                          {canDelete && !hasSpk && (
                            <button
                              onClick={() => removeLead(lead)}
                              title="Hapus"
                              aria-label="Hapus"
                              className="rounded-md p-1.5 text-red-600 transition hover:bg-red-50"
                            >
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={showActions ? 6 : 5} className="px-4 py-6 text-center text-gray-400">Tidak ada data.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {result && (
        <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
      )}

      {statusLead && (
        <StatusModal lead={statusLead} onClose={() => setStatusLead(null)} onSaved={load} />
      )}
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Protected require={['lead.read', 'lead.read.all']}>
      <LeadsInner />
    </Protected>
  );
}
