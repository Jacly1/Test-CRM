'use client';

import { useRouter } from 'next/navigation';

interface Props {
  /** Tujuan bila tidak ada riwayat navigasi (default: /dashboard). */
  fallback?: string;
  label?: string;
  className?: string;
}

export default function BackButton({ fallback = '/dashboard', label = 'Kembali', className = '' }: Props) {
  const router = useRouter();

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className={`inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M12.7 4.3a1 1 0 010 1.4L8.42 10l4.3 4.3a1 1 0 01-1.42 1.4l-5-5a1 1 0 010-1.4l5-5a1 1 0 011.42 0z" clipRule="evenodd" />
      </svg>
      {label}
    </button>
  );
}
