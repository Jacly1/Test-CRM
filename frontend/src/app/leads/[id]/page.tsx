'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Protected from '@/components/Protected';
import StatusBadge from '@/components/StatusBadge';
import Timeline from '@/components/Timeline';
import BackButton from '@/components/BackButton';
import LeadForm, { LeadFormValues } from '@/components/LeadForm';
import { EditIcon, TrashIcon } from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { api, formatCurrency } from '@/lib/api';
import { confirmAction, toastSuccess, alertError } from '@/lib/swal';
import { HistoryItem, Lead, ManagedUser } from '@/lib/types';

function ConvertForm({ lead, onDone }: { lead: Lead; onDone: () => void }) {
  const router = useRouter();
  const [projectName, setProjectName] = useState('');
  const [contractValue, setContractValue] = useState(lead.estimatedValue);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const spk = await api<{ id: string }>('/spk/convert', {
        method: 'POST',
        body: JSON.stringify({ leadId: lead.id, projectName, contractValue, startDate, endDate }),
      });
      onDone();
      await toastSuccess('Lead berhasil dikonversi ke SPK.');
      router.push(`/spk/${spk.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Gagal konversi.');
    } finally {
      setLoading(false);
    }
  }

  const input =
    'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const req = <span className="text-red-500"> *</span>;
  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <label className="block">
        <span className="text-sm font-medium text-gray-700">Nama proyek{req}</span>
        <input className={input} value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-gray-700">Nilai kontrak (Rp){req}</span>
        <input type="number" min="0" className={input} value={contractValue} onChange={(e) => setContractValue(e.target.value)} required />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Tanggal mulai{req}</span>
          <input type="date" className={input} value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Tanggal selesai{req}</span>
          <input type="date" className={input} value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </label>
      </div>
      <button disabled={loading} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50">
        {loading ? 'Memproses…' : 'Konversi ke SPK'}
      </button>
    </form>
  );
}

function ReassignPanel({ lead, onDone }: { lead: Lead; onDone: () => void }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [target, setTarget] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function openPanel() {
    setOpen(true);
    if (users.length === 0) {
      try {
        const all = await api<ManagedUser[]>('/users');
        setUsers(all.filter((u) => u.id !== lead.ownerId));
      } catch {
        /* abaikan; dropdown kosong */
      }
    }
  }

  async function submit() {
    if (!target) return;
    const newOwner = users.find((u) => u.id === target);
    const ok = await confirmAction({
      title: 'Alihkan lead?',
      text: `Lead "${lead.companyName}" akan dialihkan ke ${newOwner?.name ?? 'user terpilih'}.`,
      confirmText: 'Ya, alihkan',
    });
    if (!ok) return;
    setLoading(true);
    try {
      await api(`/leads/${lead.id}/reassign`, { method: 'PATCH', body: JSON.stringify({ ownerId: target }) });
      setOpen(false);
      setTarget('');
      onDone();
      await toastSuccess('Lead berhasil dialihkan.');
    } catch (err: any) {
      await alertError(err.message ?? 'Gagal mengalihkan lead.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 font-medium">Alihkan Lead (Reassign)</h2>
      <p className="mb-3 text-sm text-gray-500">
        Pemilik saat ini: <span className="font-medium text-gray-700">{lead.owner?.name ?? '-'}</span>
      </p>
      {!open ? (
        <button onClick={openPanel} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
          Pindahkan ke Sales lain
        </button>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm sm:max-w-xs"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">— Pilih Sales tujuan —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}{u.role?.name ? ` (${u.role.name})` : ''}</option>
            ))}
          </select>
          <button
            onClick={submit}
            disabled={!target || loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Memproses…' : 'Alihkan'}
          </button>
          <button onClick={() => setOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
            Batal
          </button>
        </div>
      )}
    </div>
  );
}

function LeadDetailInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancelChoice, setCancelChoice] = useState('');

  const canUpdate = hasPermission('lead.update');
  const canDelete = hasPermission('lead.delete');
  const canConvert = hasPermission('spk.create');
  const canReassign = hasPermission('lead.reassign');
  const isManager = hasPermission('lead.read.all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, h] = await Promise.all([
        api<Lead>(`/leads/${id}`),
        api<HistoryItem[]>(`/history?entityType=LEAD&entityId=${id}`),
      ]);
      setLead(l);
      setHistory(h);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(values: LeadFormValues) {
    await api(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(values) });
    setEditing(false);
    load();
    toastSuccess('Perubahan tersimpan.');
  }

  async function remove() {
    const ok = await confirmAction({
      title: 'Hapus Lead ini?',
      text: 'Tindakan ini tidak dapat dibatalkan.',
      danger: true,
      confirmText: 'Ya, hapus',
    });
    if (!ok) return;
    try {
      await api(`/leads/${id}`, { method: 'DELETE' });
      await toastSuccess('Lead dihapus.');
      router.push('/leads');
    } catch (err: any) {
      await alertError(err.message ?? 'Gagal menghapus.');
    }
  }

  async function cancelLead() {
    const ok = await confirmAction({
      title: 'Batalkan Lead?',
      text: 'Lead akan berstatus CANCELLED. SPK yang terkait juga akan ikut dibatalkan.',
      danger: true,
      confirmText: 'Ya, batalkan',
    });
    if (!ok) return;
    try {
      await api(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) });
      setCancelChoice('');
      load();
      await toastSuccess('Lead dibatalkan.');
    } catch (err: any) {
      await alertError(err.message ?? 'Gagal membatalkan lead.');
    }
  }

  if (loading) return <div className="text-gray-500">Memuat…</div>;
  if (!lead) return <div className="text-gray-500">Lead tidak ditemukan.</div>;

  const spk = lead.spk as Lead['spk'];
  const hasSpk = !!spk;
  const spkId = spk ? (spk as any).id : null;
  const spkFinanceStatus = spk ? (spk as any).financeStatus : null;
  const isCancelled = lead.status === 'CANCELLED';
  const approvedLocked = hasSpk && spkFinanceStatus === 'APPROVED' && !isManager;
  // Pembatalan lead ber-SPK hanya untuk Finance/Admin (punya spk.cancel) — Sales tidak boleh.
  const canCancelViaLead =
    canUpdate && hasPermission('spk.cancel') && hasSpk && !isCancelled && !approvedLocked;
  // Edit penuh hanya saat belum ada SPK & belum dibatalkan.
  const canFullEdit = canUpdate && !hasSpk && !isCancelled;

  return (
    <div>
      <BackButton fallback="/leads" />

      <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-xl font-semibold">{lead.companyName}</h1>
              <StatusBadge status={lead.status} />
            </div>

            {editing && canFullEdit ? (
              <LeadForm initial={lead} onSubmit={save} submitLabel="Simpan perubahan" onCancel={() => setEditing(false)} />
            ) : (
              <>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <Item label="Kontak" value={lead.contactName} />
                  <Item label="Telepon" value={lead.phone} />
                  <Item label="Email" value={lead.email} />
                  <Item label="Sumber" value={lead.source} />
                  <Item label="Estimasi nilai" value={formatCurrency(lead.estimatedValue)} />
                  <Item label="Sales" value={lead.owner?.name ?? '-'} />
                </dl>

                {/* Catatan — satu data dengan field di form edit */}
                <div className="mt-4 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M4 3a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h1a2 2 0 002-2V5a2 2 0 00-2-2H4z" />
                    </svg>
                    Catatan
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">{lead.notes || 'Tidak ada catatan.'}</p>
                </div>
              </>
            )}

            {!editing && (canFullEdit || (canDelete && !hasSpk)) && !isCancelled && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {canFullEdit && (
                  <button
                    onClick={() => setEditing(true)}
                    title="Edit"
                    aria-label="Edit"
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <EditIcon size={16} /> Edit
                  </button>
                )}
                {canDelete && !hasSpk && (
                  <button
                    onClick={remove}
                    title="Hapus"
                    aria-label="Hapus"
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  >
                    <TrashIcon size={16} /> Hapus
                  </button>
                )}
              </div>
            )}

            {/* Pengubahan status saat sudah ada SPK: hanya boleh menjadi CANCELLED */}
            {canCancelViaLead && (
              <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="mb-2 text-sm font-medium text-gray-700">Ubah status</p>
                <p className="mb-3 text-xs text-gray-500">
                  Lead ini sudah memiliki SPK, sehingga status hanya dapat diubah menjadi <strong>CANCELLED</strong>.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={cancelChoice}
                    onChange={(e) => setCancelChoice(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm sm:max-w-xs"
                  >
                    <option value="">{lead.status} (saat ini)</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                  <button
                    onClick={cancelLead}
                    disabled={cancelChoice !== 'CANCELLED'}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
                  >
                    Simpan Status
                  </button>
                </div>
              </div>
            )}

            {approvedLocked && (
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Lead terkunci karena SPK sudah <strong>disetujui</strong>. Pembatalan dilakukan oleh Finance/Admin melalui halaman SPK.
              </div>
            )}
          </div>

          {canReassign && !isCancelled && <ReassignPanel lead={lead} onDone={load} />}

          {(canConvert || hasSpk) && !isCancelled && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-medium">Konversi ke SPK</h2>
              {hasSpk ? (
                <p className="text-sm text-gray-600">
                  Lead ini sudah memiliki SPK.{' '}
                  {spkId && <Link href={`/spk/${spkId}`} className="text-blue-700 hover:underline">Lihat SPK →</Link>}
                </p>
              ) : lead.status !== 'WON' ? (
                <p className="text-sm text-gray-500">Hanya Lead berstatus <strong>WON</strong> yang dapat dikonversi. Status saat ini: {lead.status}.</p>
              ) : (
                <ConvertForm lead={lead} onDone={load} />
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-medium">Riwayat Status</h2>
          <Timeline items={history} />
        </div>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-400">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  );
}

export default function LeadDetailPage() {
  return (
    <Protected require={['lead.read', 'lead.read.all']}>
      <LeadDetailInner />
    </Protected>
  );
}
