import Link from 'next/link';
import type { ReactNode } from 'react';

interface SettingsLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/settings/ai', label: 'AI 어시스트' },
];

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--surface-primary)' }}
    >
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Page title */}
        <div className="mb-8">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--text-active)' }}
          >
            설정
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            HumanWrites 환경 설정
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar nav */}
          <nav
            className="w-44 shrink-0"
            aria-label="설정 메뉴"
          >
            <ul className="flex flex-col gap-0.5">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-secondary)]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content area */}
          <main className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
