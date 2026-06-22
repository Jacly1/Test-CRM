'use client';

import { FormEvent, useState } from 'react';
import { Lead, LEAD_STATUSES, LeadStatus } from '@/lib/types';

export interface LeadFormValues {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  source: string;
  estimatedValue: string;
  status: LeadStatus;
  notes: string;
}

interface Props {
  initial?: Partial<Lead>;
  onSubmit: (values: LeadFormValues) => Promise<void>;
  submitLabel?: string;
  /** Daftar status yang boleh dipilih. Default: pipeline normal tanpa CANCELLED. */
  statusOptions?: LeadStatus[];
  /** Sembunyikan pemilihan status (mis. saat membuat lead baru). */
  hideStatus?: boolean;
  /** Sembunyikan field catatan (mis. saat edit — catatan dikelola via Ubah Status / Riwayat). */
  hideNotes?: boolean;
  onCancel?: () => void;
}

const PIPELINE: LeadStatus[] = LEAD_STATUSES.filter((s) => s !== 'CANCELLED');

function Req() {
  return <span className="text-red-500" aria-hidden="true"> *</span>;
}

export default function LeadForm({
  initial,
  onSubmit,
  submitLabel = 'Simpan',
  statusOptions = PIPELINE,
  hideStatus = false,
  hideNotes = false,
  onCancel,
}: Props) {
  const [values, setValues] = useState<LeadFormValues>({
    companyName: initial?.companyName ?? '',
    contactName: initial?.contactName ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    source: initial?.source ?? '',
    estimatedValue: initial?.estimatedValue ?? '',
    status: (initial?.status as LeadStatus) ?? 'NEW',
    notes: initial?.notes ?? '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set<K extends keyof LeadFormValues>(key: K, val: LeadFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function handle(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit(values);
    } catch (err: any) {
      setError(err.message ?? 'Gagal menyimpan.');
    } finally {
      setLoading(false);
    }
  }

  const input =
    'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <form onSubmit={handle} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Nama perusahaan<Req /></span>
          <input className={input} value={values.companyName} onChange={(e) => set('companyName', e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Nama kontak<Req /></span>
          <input className={input} value={values.contactName} onChange={(e) => set('contactName', e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Nomor telepon<Req /></span>
          <input
            className={input}
            value={values.phone}
            onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="cth. 08123456789"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Email<Req /></span>
          <input type="email" className={input} value={values.email} onChange={(e) => set('email', e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Sumber Lead<Req /></span>
          <input className={input} value={values.source} onChange={(e) => set('source', e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Estimasi nilai (Rp)<Req /></span>
          <input type="number" min="0" className={input} value={values.estimatedValue} onChange={(e) => set('estimatedValue', e.target.value)} required />
        </label>
        {!hideStatus && (
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <select className={input} value={values.status} onChange={(e) => set('status', e.target.value as LeadStatus)}>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Catatan — satu data dengan panel di halaman detail */}
      {!hideNotes && (
        <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4">
          <label className="block">
            <span className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M4 3a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h1a2 2 0 002-2V5a2 2 0 00-2-2H4z" />
              </svg>
              Catatan
            </span>
            <textarea
              className="mt-2 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              rows={3}
              placeholder="Tambahkan catatan penting tentang lead ini…"
              value={values.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Menyimpan…' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Batal
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400"><span className="text-red-500">*</span> wajib diisi</p>
    </form>
  );
}
