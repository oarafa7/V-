'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/users', label: 'Users' },
  { href: '/plans', label: 'Plans & Pricing' },
  { href: '/biomarkers', label: 'Biomarkers' },
  { href: '/categories', label: 'Categories' },
  { href: '/goals', label: 'Health Goals' },
  { href: '/content', label: 'App Content' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-line bg-panel/60 p-4">
      <div className="px-2 py-3">
        <div className="font-display text-2xl font-extrabold tracking-tight text-ink">VITAL</div>
        <div className="text-xs text-inkSoft">Admin</div>
      </div>
      <nav className="mt-4 flex-1 space-y-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              isActive(item.href) ? 'bg-accent/15 text-greenInk' : 'text-inkSoft hover:bg-panel'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-line pt-3">
        <div className="px-3 text-xs text-inkMuted">{user?.email}</div>
        <button onClick={logout} className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-inkSoft hover:bg-panel">
          Sign out
        </button>
      </div>
    </aside>
  );
}
