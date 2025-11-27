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

interface NavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Navigation({ isOpen, onClose }: NavigationProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Navigation sidebar */}
      <nav
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SSG ONE</h1>
              <p className="text-sm text-gray-500 mt-1">LINE Bot 管理</p>
            </div>
            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="lg:hidden text-gray-500 hover:text-gray-700"
              aria-label="Close menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-3 py-2 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition min-h-[44px] ${
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

        <div className="p-4 border-t border-gray-200">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm min-h-[44px]"
          >
            <span>←</span>
            <span>ホームに戻る</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
