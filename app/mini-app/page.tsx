'use client';

import { useEffect, useState } from 'react';
import liff from '@line/liff';

type MenuItem = {
  id: string;
  label: string;
  icon: string;
  description: string;
  href: string;
  disabled?: boolean;
};

const menuItems: MenuItem[] = [
  {
    id: 'payment',
    label: '決済',
    icon: '💰',
    description: '売上登録・取り消し',
    href: '/mini-app/payment',
    disabled: true,
  },
  {
    id: 'report',
    label: '日報',
    icon: '📝',
    description: '日次報告の入力',
    href: '/mini-app/report',
    disabled: true,
  },
  {
    id: 'admin',
    label: '管理画面',
    icon: '🔐',
    description: 'ダッシュボード',
    href: '/admin',
    disabled: true,
  },
];

export default function MiniAppPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (e) {
        console.error('LIFF init error:', e);
        setError('初期化に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    initLiff();
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.svg" alt="SSG ONE" className="h-16 mx-auto mb-4" />
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (!item.disabled) {
                  window.location.href = item.href;
                }
              }}
              disabled={item.disabled}
              className={`w-full bg-white rounded-lg shadow-sm p-4 flex items-center text-left transition ${
                item.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:shadow-md active:bg-gray-50'
              }`}
            >
              <span className="text-3xl mr-4">{item.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              {item.disabled && (
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
