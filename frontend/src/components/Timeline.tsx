import { HistoryItem } from '@/lib/types';
import { formatDate } from '@/lib/api';

export default function Timeline({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">Belum ada riwayat.</p>;
  }
  return (
    <ol className="relative border-l border-gray-200 pl-5">
      {items.map((h) => (
        <li key={h.id} className="mb-5 ml-2">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-blue-500" />
          <div className="text-sm">
            <span className="font-medium text-gray-800">
              {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : h.toStatus}
            </span>
          </div>
          {h.notes && <p className="text-sm text-gray-600">{h.notes}</p>}
          <p className="mt-0.5 text-xs text-gray-400">
            {h.changedBy?.name ?? 'Sistem'}
            {h.changedBy?.role?.name ? ` (${h.changedBy.role.name})` : ''} · {formatDate(h.createdAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}
