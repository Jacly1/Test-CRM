'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Navbar() {
  const { user, logout, hasPermission } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const links = [
    { href: '/dashboard', label: 'Dashboard', show: hasPermission('dashboard.read') },
    { href: '/leads', label: 'Leads', show: hasPermission(['lead.read', 'lead.read.all']) },
    { href: '/spk', label: 'SPK', show: hasPermission(['spk.read', 'spk.read.all']) },
    { href: '/users', label: 'User', show: hasPermission('user.read') },
    { href: '/roles', label: 'Role', show: hasPermission('role.read') },
  ].filter((l) => l.show);

  const isActive = (href: string) => pathname.startsWith(href);
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  function linkClass(href: string) {
    return `rounded-md px-3 py-2 text-sm font-medium transition ${
      isActive(href) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;
  }

  return (
    <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">CK</span>
            <span className="hidden font-semibold text-gray-900 sm:block">CRM Solusi Klik</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass(l.href)}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right: user + logout (desktop) */}
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/profile" className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                {initials || 'U'}
              </span>
              <span className="text-left leading-tight">
                <span className="block max-w-[140px] truncate text-sm font-medium text-gray-800">{user.name}</span>
                <span className="block text-xs text-gray-500">{user.roleName ?? 'Tanpa role'}</span>
              </span>
            </Link>
            <button
              onClick={logout}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Keluar
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 md:hidden"
            aria-label="Buka menu"
            aria-expanded={open}
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.3 4.3a1 1 0 011.4 0L10 8.6l4.3-4.3a1 1 0 111.4 1.4L11.4 10l4.3 4.3a1 1 0 01-1.4 1.4L10 11.4l-4.3 4.3a1 1 0 01-1.4-1.4L8.6 10 4.3 5.7a1 1 0 010-1.4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm1 4a1 1 0 100 2h12a1 1 0 100-2H4z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <div className="mx-auto max-w-6xl space-y-1 px-4 py-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block ${linkClass(l.href)}`}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3">
              <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                  {initials || 'U'}
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-medium text-gray-800">{user.name}</span>
                  <span className="block text-xs text-gray-500">{user.roleName ?? 'Tanpa role'}</span>
                </span>
              </Link>
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
