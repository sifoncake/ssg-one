'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { name: 'ダッシュボード', href: '/admin/dashboard', icon: '📊' },
  { name: 'ユーザー管理', href: '/admin/users', icon: '👥' },
  { name: 'メッセージ配信', href: '/admin/broadcast', icon: '📢' },
  { name: '分析', href: '/admin/analytics', icon: '📈' },
  { name: '設定', href: '/admin/settings', icon: '⚙️' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">SSG ONE</h1>
        <p className="text-sm text-gray-500 mt-1">LINE Bot 管理</p>
      </div>

      <div className="px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
        >
          <span>←</span>
          <span>ホームに戻る</span>
        </Link>
      </div>
    </nav>
  );
}
