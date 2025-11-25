'use client';

import { useState } from 'react';
import AdminLayout from '@/app/components/AdminLayout';

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: null, message: '' });

    // Simulate save
    setTimeout(() => {
      setStatus({
        type: 'success',
        message: '設定を保存しました',
      });
      setSaving(false);
    }, 1000);
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">設定</h1>
          <p className="text-gray-600 mt-2">
            LINE Bot とシステムの設定
          </p>
        </div>

        <div className="space-y-6">
          {/* Bot Configuration */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Bot 設定</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bot 名
                </label>
                <input
                  type="text"
                  defaultValue="SSG ONE Bot"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ウェルカムメッセージ
                </label>
                <textarea
                  defaultValue="こんにちは！SSG ONE Bot へようこそ。"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    自動返信を有効にする
                  </p>
                  <p className="text-sm text-gray-500">
                    ユーザーからのメッセージに自動で返信します
                  </p>
                </div>
                <button
                  type="button"
                  className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-blue-600"
                >
                  <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                </button>
              </div>
            </div>
          </div>

          {/* Webhook Settings */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Webhook 設定</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    defaultValue="https://018j8m1954.execute-api.ap-northeast-1.amazonaws.com/prod/line-webhook"
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm font-mono"
                  />
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition text-sm"
                  >
                    コピー
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">ℹ️</span>
                  <div>
                    <p className="text-sm text-blue-800 font-medium">
                      LINE Developers での設定
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      上記のWebhook URLをLINE Developersコンソールに設定してください
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* API Configuration */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">API 設定</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LINE Channel Access Token
                </label>
                <input
                  type="password"
                  defaultValue="************************"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LINE Channel Secret
                </label>
                <input
                  type="password"
                  defaultValue="************************"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">
                      セキュリティ警告
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      APIキーは環境変数として安全に管理されています。この画面では表示のみです。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Users */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">管理者設定</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-900">admin@example.com</p>
                    <p className="text-xs text-gray-500">メイン管理者</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    アクティブ
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="mt-4 w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                + 管理者を追加
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="py-2 px-6 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="py-2 px-6 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition text-sm font-medium"
            >
              {saving ? '保存中...' : '変更を保存'}
            </button>
          </div>

          {status.type && (
            <div
              className={`p-4 rounded-md ${
                status.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {status.message}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
