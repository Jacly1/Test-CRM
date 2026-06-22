interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4">
      <button
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Sebelumnya
      </button>
      <span className="text-sm text-gray-600">
        Halaman {page} dari {totalPages}
      </span>
      <button
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Berikutnya
      </button>
    </div>
  );
}
