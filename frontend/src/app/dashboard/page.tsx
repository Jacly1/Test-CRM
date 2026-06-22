'use client';

import { useEffect, useState } from 'react';
import Protected from '@/components/Protected';
import { api } from '@/lib/api';
import { DashboardStats } from '@/lib/types';

function Card({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 font-medium">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada data.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{k}</span>
              <span className="font-medium text-gray-900">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DashboardInner() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<DashboardStats>('/dashboard')
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Memuat…</div>;
  if (!stats) return <div className="text-gray-500">Gagal memuat dashboard.</div>;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
          {stats.scope === 'all' ? 'Semua data' : 'Data Anda'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card label="Total Lead" value={stats.leads.total} />
        <Card label="Total SPK" value={stats.spk.total} />
        <Card
          label="SPK menunggu verifikasi"
          value={stats.spk.awaitingVerification}
          hint="Status SUBMITTED + PENDING"
        />
        {stats.users && <Card label="Total User" value={stats.users.total} />}
        {stats.roles && <Card label="Total Role" value={stats.roles.total} />}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Breakdown title="Lead per status" data={stats.leads.byStatus} />
        <Breakdown title="SPK per status Finance" data={stats.spk.byFinanceStatus} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Protected require="dashboard.read">
      <DashboardInner />
    </Protected>
  );
}
