'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Protected from '@/components/Protected';
import StatusBadge from '@/components/StatusBadge';
import Pagination from '@/components/Pagination';
import BackButton from '@/components/BackButton';
import { api, formatCurrency } from '@/lib/api';
import { Paginated, Spk } from '@/lib/types';

function SpkInner() {
  const [result, setResult] = useState<Paginated<Spk> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('limit', '10');
    try {
      setResult(await api<Paginated<Spk>>(`/spk?${params.toString()}`));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div>
      <BackButton className="mb-4" />
      <h1 className="mb-5 text-xl font-semibold">SPK</h1>

      <div className="mb-4">
        <input
          placeholder="Cari nomor SPK / nama proyek…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm sm:max-w-xs"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nomor SPK</th>
              <th className="px-4 py-3">Proyek</th>
              <th className="px-4 py-3">Nilai</th>
              <th className="px-4 py-3">Sales</th>
              <th className="px-4 py-3">Finance</th>
              <th className="px-4 py-3">Ditangani</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Memuat…</td></tr>
            ) : result && result.data.length > 0 ? (
              result.data.map((spk) => (
                <tr key={spk.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/spk/${spk.id}`} className="font-medium text-blue-700 hover:underline">
                      {spk.spkNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{spk.projectName}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(spk.contractValue)}</td>
                  <td className="px-4 py-3"><StatusBadge status={spk.salesStatus} /></td>
                  <td className="px-4 py-3"><StatusBadge status={spk.financeStatus} /></td>
                  <td className="px-4 py-3 text-gray-500">{spk.assignedFinance?.name ?? '—'}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Tidak ada data.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {result && <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />}
    </div>
  );
}

export default function SpkPage() {
  return (
    <Protected require={['spk.read', 'spk.read.all']}>
      <SpkInner />
    </Protected>
  );
}
