'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Protected from '@/components/Protected';
import StatusBadge from '@/components/StatusBadge';
import Timeline from '@/components/Timeline';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/lib/auth';
import { api, formatCurrency, formatDate } from '@/lib/api';
import { confirmAction, promptReason, toastSuccess, alertError } from '@/lib/swal';
import { HistoryItem, ManagedUser, Spk } from '@/lib/types';

type VerifyMode = null | 'approve' | 'reject';

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4.3 4.3a1 1 0 011.4 0L10 8.6l4.3-4.3a1 1 0 111.4 1.4L11.4 10l4.3 4.3a1 1 0 01-1.4 1.4L10 11.4l-4.3 4.3a1 1 0 01-1.4-1.4L8.6 10 4.3 5.7a1 1 0 010-1.4z" clipRule="evenodd" />
    </svg>
  );
}

function AssignControl({ spk, onDone }: { spk: Spk; onDone: () => void }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(spk.assignedFinanceId ?? '');
  const [busy, setBusy] = useState(false);

  async function openPanel() {
    setOpen(true);
    if (users.length === 0) {
      try {
        setUsers(await api<ManagedUser[]>('/users'));
      } catch {
        /* abaikan */
      }
    }
  }

  async function apply() {
    setBusy(true);
    try {
      await api(`/spk/${spk.id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedFinanceId: target || null }),
      });
      setOpen(false);
      onDone();
      await toastSuccess('Penugasan SPK diperbarui.');
    } catch (err: any) {
      await alertError(err.message ?? 'Gagal menugaskan SPK.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="mb-1 text-sm font-medium text-gray-700">Penugasan Finance (Admin)</p>
      <p className="mb-3 text-xs text-gray-500">
        Ditangani oleh: <span className="font-medium">{spk.assignedFinance?.name ?? 'Antrian bersama (belum diklaim)'}</span>
      </p>
      {!open ? (
        <button onClick={openPanel} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-100">
          Tugaskan / alihkan
        </button>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm sm:max-w-xs">
            <option value="">— Antrian bersama (lepas) —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}{u.role?.name ? ` (${u.role.name})` : ''}</option>
            ))}
          </select>
          <button onClick={apply} disabled={busy} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? 'Memproses…' : 'Terapkan'}
          </button>
          <button onClick={() => setOpen(false)} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-100">Batal</button>
        </div>
      )}
    </div>
  );
}

function SpkDetailInner() {
  const { id } = useParams<{ id: string }>();
  const { user, hasPermission } = useAuth();
  const [spk, setSpk] = useState<Spk | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<VerifyMode>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([
        api<Spk>(`/spk/${id}`),
        api<HistoryItem[]>(`/history?entityType=SPK&entityId=${id}`),
      ]);
      setSpk(s);
      setHistory(h);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function openMode(m: VerifyMode) {
    setError('');
    setNote('');
    setMode(m);
  }

  async function run(fn: () => Promise<unknown>, success?: string) {
    setError('');
    setBusy(true);
    try {
      await fn();
      setMode(null);
      setNote('');
      await load();
      if (success) await toastSuccess(success);
    } catch (err: any) {
      setError(err.message ?? 'Gagal memproses.');
    } finally {
      setBusy(false);
    }
  }

  async function doSubmit() {
    const ok = await confirmAction({
      title: spk?.financeStatus === 'REJECTED' ? 'Ajukan ulang ke Finance?' : 'Kirim SPK ke Finance?',
      text: 'SPK akan masuk antrian verifikasi Finance.',
      confirmText: 'Ya, kirim',
    });
    if (!ok) return;
    run(() => api(`/spk/${id}/submit`, { method: 'POST' }), 'SPK dikirim ke Finance.');
  }

  async function doClaim() {
    run(() => api(`/spk/${id}/claim`, { method: 'POST' }), 'SPK berhasil diklaim. Sekarang Anda yang menangani.');
  }

  async function doCancel() {
    const reason = await promptReason({
      title: 'Batalkan SPK?',
      inputLabel: 'Alasan pembatalan (wajib). Lead terkait akan ikut dibatalkan.',
      placeholder: 'cth. Klien membatalkan proyek…',
      confirmText: 'Batalkan SPK',
      required: true,
      danger: true,
    });
    if (reason === null) return;
    run(() => api(`/spk/${id}/cancel`, { method: 'POST', body: JSON.stringify({ notes: reason }) }), 'SPK dibatalkan. Lead ikut dibatalkan.');
  }

  if (loading) return <div className="text-gray-500">Memuat…</div>;
  if (!spk) return <div className="text-gray-500">SPK tidak ditemukan.</div>;

  const approved = spk.financeStatus === 'APPROVED';
  const rejected = spk.financeStatus === 'REJECTED';
  const cancelled = spk.financeStatus === 'CANCELLED';
  const awaitingVerify = spk.salesStatus === 'SUBMITTED' && spk.financeStatus === 'PENDING';

  const isAdminLevel = hasPermission('spk.assign');
  const assignedId = spk.assignedFinanceId ?? null;
  const mine = assignedId === user?.id;
  const lockedByOther = !!assignedId && !mine && !isAdminLevel;
  const claimedByMe = mine || isAdminLevel; // Admin boleh tanpa klaim

  const canSubmit = hasPermission('spk.submit') && !approved && !cancelled && (spk.salesStatus === 'DRAFT' || spk.financeStatus === 'REJECTED');
  // Langkah 1 — Finance klaim dulu (saat PENDING & belum diklaim). Admin lewat panel penugasan.
  const canClaim = hasPermission('spk.claim') && awaitingVerify && !assignedId && !isAdminLevel;
  // Langkah 2 — Setujui/Tolak hanya setelah SPK diklaim sendiri.
  const canApprove = hasPermission('spk.approve') && awaitingVerify && claimedByMe;
  const canReject = hasPermission('spk.reject') && awaitingVerify && claimedByMe;
  // Langkah 3 — Batalkan hanya setelah SPK disetujui (diterima).
  const canCancel = hasPermission('spk.cancel') && approved && !lockedByOther;
  const needsClaim = hasPermission('spk.approve') && awaitingVerify && !claimedByMe && !lockedByOther;
  const anyAction = canSubmit || canApprove || canReject || canClaim || canCancel;

  return (
    <div>
      <BackButton fallback="/spk" />

      <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-xl font-semibold">{spk.spkNumber}</h1>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={spk.salesStatus} />
                <StatusBadge status={spk.financeStatus} />
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Item label="Proyek" value={spk.projectName} />
              <Item label="Perusahaan" value={spk.lead?.companyName ?? '-'} />
              <Item label="Nilai kontrak" value={formatCurrency(spk.contractValue)} />
              <Item label="Mulai" value={formatDate(spk.startDate)} />
              <Item label="Selesai" value={formatDate(spk.endDate)} />
              <Item label="Ditangani Finance" value={spk.assignedFinance?.name ?? 'Belum diklaim'} />
            </dl>

            {spk.financeNotes && (
              <div className={`mt-4 rounded-lg border-l-4 p-4 ${cancelled || rejected ? 'border-red-400 bg-red-50' : 'border-amber-400 bg-amber-50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${cancelled || rejected ? 'text-red-800' : 'text-amber-800'}`}>
                  Catatan Finance terakhir
                </p>
                <p className={`mt-1 whitespace-pre-wrap text-sm ${cancelled || rejected ? 'text-red-900' : 'text-amber-900'}`}>{spk.financeNotes}</p>
              </div>
            )}

            {spk.lead && (
              <p className="mt-4 text-sm">
                <Link href={`/leads/${spk.lead.id}`} className="text-blue-700 hover:underline">
                  Lihat Lead terkait →
                </Link>
              </p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-medium">Verifikasi & Aksi</h2>
              {awaitingVerify && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Menunggu verifikasi
                </span>
              )}
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            {/* Status banners */}
            {approved && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                <CheckIcon /> SPK telah disetujui. {canCancel && 'Bila diperlukan, SPK masih dapat dibatalkan.'}
              </div>
            )}
            {cancelled && (
              <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                SPK telah dibatalkan. Lead terkait juga dibatalkan.
              </div>
            )}
            {rejected && !awaitingVerify && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                SPK ditolak. Sales dapat memperbaiki lalu mengajukan ulang.
              </div>
            )}
            {lockedByOther && awaitingVerify && (
              <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                SPK sedang ditangani oleh <strong>{spk.assignedFinance?.name ?? 'Finance lain'}</strong>. Anda tidak dapat memverifikasi kecuali ditugaskan ulang oleh Admin.
              </div>
            )}
            {mine && awaitingVerify && (
              <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                Anda yang menangani SPK ini.
              </div>
            )}

            {needsClaim && (
              <p className="mb-3 text-sm text-gray-600">
                Klaim SPK ini terlebih dahulu untuk dapat <strong>menyetujui</strong> atau <strong>menolak</strong>.
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              {/* Sales: submit / resubmit */}
              {canSubmit && (
                <button
                  disabled={busy}
                  onClick={doSubmit}
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {spk.financeStatus === 'REJECTED' ? 'Ajukan Ulang ke Finance' : 'Kirim ke Finance'}
                </button>
              )}

              {/* Finance: claim from shared queue */}
              {canClaim && (
                <button
                  disabled={busy}
                  onClick={doClaim}
                  className="inline-flex items-center gap-2 rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                >
                  Klaim SPK ini
                </button>
              )}

              {/* Finance: verify */}
              {(canApprove || canReject) && mode === null && (
                <>
                  {canApprove && (
                    <button
                      onClick={() => openMode('approve')}
                      className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                    >
                      <CheckIcon /> Setujui
                    </button>
                  )}
                  {canReject && (
                    <button
                      onClick={() => openMode('reject')}
                      className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                    >
                      <XIcon /> Tolak
                    </button>
                  )}
                </>
              )}

              {/* Finance / Admin: cancel */}
              {canCancel && mode === null && (
                <button
                  onClick={doCancel}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Batalkan SPK
                </button>
              )}
            </div>

            {/* Approve panel */}
            {mode === 'approve' && canApprove && (
              <div className="mt-3 rounded-lg border border-green-200 bg-green-50/60 p-4">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-green-800">
                  <CheckIcon /> Setujui SPK
                </div>
                <p className="mb-3 text-xs text-green-700">Anda akan menyetujui SPK ini. Catatan bersifat opsional.</p>
                <textarea
                  className="w-full rounded-md border border-green-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400"
                  rows={3}
                  placeholder="Catatan persetujuan (opsional)…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => run(() => api(`/spk/${id}/approve`, { method: 'POST', body: JSON.stringify({ notes: note }) }), 'SPK disetujui.')}
                    className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                  >
                    {busy ? 'Memproses…' : 'Konfirmasi Persetujuan'}
                  </button>
                  <button onClick={() => setMode(null)} disabled={busy} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* Reject panel */}
            {mode === 'reject' && canReject && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50/60 p-4">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-red-800">
                  <XIcon /> Tolak SPK
                </div>
                <p className="mb-3 text-xs text-red-700">Jelaskan alasan penolakan. Catatan ini wajib dan akan terlihat oleh Sales.</p>
                <textarea
                  className="w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
                  rows={3}
                  placeholder="Alasan penolakan (wajib)…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={busy || !note.trim()}
                    onClick={() => run(() => api(`/spk/${id}/reject`, { method: 'POST', body: JSON.stringify({ notes: note }) }), 'SPK ditolak.')}
                    className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    {busy ? 'Memproses…' : 'Konfirmasi Penolakan'}
                  </button>
                  <button onClick={() => setMode(null)} disabled={busy} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* Admin: assignment control */}
            {isAdminLevel && !cancelled && <AssignControl spk={spk} onDone={load} />}

            {!anyAction && !approved && !rejected && !cancelled && !isAdminLevel && (
              <p className="text-sm text-gray-500">Tidak ada aksi yang tersedia untuk Anda saat ini.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-medium">Riwayat Status &amp; Catatan</h2>
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

export default function SpkDetailPage() {
  return (
    <Protected require={['spk.read', 'spk.read.all']}>
      <SpkDetailInner />
    </Protected>
  );
}
