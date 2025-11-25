'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import { supabase } from '@/lib/supabase';

export default function BroadcastPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  useEffect(() => {
    fetchUserCount();
  }, []);

  const fetchUserCount = async () => {
    try {
      const { count } = await supabase
        .from('line_users')
        .select('*', { count: 'exact', head: true });
      setUserCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch user count:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/send-line`
        : '/api/send-line';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          type: 'success',
          message: `全ユーザー（${userCount}名）にメッセージを送信しました`,
        });
        setMessage('');
      } else {
        setStatus({
          type: 'error',
          message: data.error || 'メッセージの送信に失敗しました',
        });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'エラーが発生しました',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">メッセージ一斉配信</h1>
          <p className="text-gray-600 mt-2">
            すべてのユーザーにメッセージを送信します
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <p className="text-sm text-blue-800 font-medium">配信先</p>
              <p className="text-sm text-blue-700 mt-1">
                現在 <span className="font-bold">{userCount}名</span> のユーザーに配信されます
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                メッセージ内容
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="配信するメッセージを入力してください"
                required
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-2">
                文字数: {message.length}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
            >
              {loading ? '送信中...' : `${userCount}名に一斉配信`}
            </button>
          </form>

          {status.type && (
            <div
              className={`mt-6 p-4 rounded-md ${
                status.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {status.message}
            </div>
          )}
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-sm text-yellow-800 font-medium">注意事項</p>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                <li>配信後の取り消しはできません</li>
                <li>不適切な内容の配信は避けてください</li>
                <li>大量配信には時間がかかる場合があります</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
