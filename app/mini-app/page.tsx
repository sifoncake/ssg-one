'use client';

import { useEffect, useState } from 'react';
import liff from '@line/liff';

type MenuItem = {
  id: string;
  label: string;
  icon: string;
  description: string;
  href?: string;
  permission?: string;
  comingSoon?: boolean;
  action?: 'admin';
};

const allMenuItems: MenuItem[] = [
  {
    id: 'attendance',
    label: '出退勤',
    icon: '🕐',
    description: '出勤・退勤打刻',
    href: '/mini-app/attendance',
    comingSoon: false,
  },
  {
    id: 'payment',
    label: '決済',
    icon: '💰',
    description: '売上登録・取り消し',
    href: '/mini-app/payment',
    permission: 'payment',
    comingSoon: false,
  },
  {
    id: 'report',
    label: '日報',
    icon: '📝',
    description: '日次報告の入力',
    href: '/mini-app/report',
    permission: 'report',
    comingSoon: true,
  },
  {
    id: 'admin',
    label: '管理画面',
    icon: '🔐',
    description: 'ダッシュボード',
    permission: 'admin',
    comingSoon: false,
    action: 'admin',
  },
];

export default function MiniAppPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    const initLiff = async () => {
      const liffId = process.env.NEXT_PUBLIC_MINI_APP_LIFF_ID;
      if (!liffId) {
        setError('LIFF IDが設定されていません');
        setIsLoading(false);
        return;
      }

      try {
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        setUserName(profile.displayName);

        // Get user permissions
        const response = await fetch(`/api/user/role?lineUserId=${profile.userId}`);
        if (response.ok) {
          const data = await response.json();
          setPermissions(data.permissions || []);

          // Filter menu items based on permissions
          const visibleItems = allMenuItems.filter(
            item => !item.permission || data.permissions?.includes(item.permission)
          );
          setMenuItems(visibleItems);
        } else {
          // If API fails, show no permission-required items
          setMenuItems(allMenuItems.filter(item => !item.permission));
        }
      } catch (e) {
        console.error('LIFF init error:', e);
        setError('初期化に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    initLiff();
  }, []);

  const handleAdminClick = async () => {
    setNavigating(true);
    try {
      const idToken = liff.getIDToken();
      if (!idToken) {
        setError('LINEトークンを取得できませんでした');
        setNavigating(false);
        return;
      }

      const response = await fetch('/api/auth/generate-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineIdToken: idToken }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || '管理画面へのアクセスに失敗しました');
        setNavigating(false);
        return;
      }

      // Redirect to magic link auth page
      window.location.href = `/auth/magic?token=${data.token}`;
    } catch (e) {
      console.error('Admin navigation error:', e);
      setError('エラーが発生しました');
      setNavigating(false);
    }
  };

  const handleMenuClick = (item: MenuItem) => {
    if (item.comingSoon) return;

    if (item.action === 'admin') {
      handleAdminClick();
    } else if (item.href) {
      window.location.href = item.href;
    }
  };

  if (isLoading || navigating) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.svg" alt="SSG ONE" className="h-16 mx-auto mb-4" />
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          {navigating && <p className="text-gray-600 mt-4">管理画面に移動中...</p>}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center">
          <img src="/logo.svg" alt="SSG ONE" className="h-8 mr-3" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">SSG ONE</h1>
            {userName && (
              <p className="text-sm text-gray-500">{userName} さん</p>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4">
        <div className="space-y-3">
          {menuItems.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <p className="text-gray-500">利用可能なメニューがありません</p>
            </div>
          )}
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item)}
              disabled={item.comingSoon}
              className={`w-full bg-white rounded-lg shadow-sm p-4 flex items-center text-left transition ${
                item.comingSoon
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:shadow-md active:bg-gray-50'
              }`}
            >
              <span className="text-3xl mr-4">{item.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              {item.comingSoon && (
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                  準備中
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          SSG ONE ミニアプリ v0.1
        </p>
      </div>
    </main>
  );
}
