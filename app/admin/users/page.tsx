'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import { supabase, LINEUser } from '@/lib/supabase';

export default function UsersPage() {
  const [users, setUsers] = useState<LINEUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [messageText, setMessageText] = useState<{ [key: string]: string }>({});
  const [sendStatus, setSendStatus] = useState<{
    userId: string;
    status: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('line_users')
        .select('*')
        .order('last_seen_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (userId: string) => {
    const message = messageText[userId];
    if (!message?.trim()) {
      setSendStatus({
        userId,
        status: 'error',
        message: 'メッセージを入力してください',
      });
      return;
    }

    setSendingTo(userId);
    setSendStatus(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/send-push`
        : '/api/send-push';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          message,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSendStatus({
          userId,
          status: 'success',
          message: 'メッセージを送信しました',
        });
        setMessageText((prev) => ({ ...prev, [userId]: '' }));
      } else {
        setSendStatus({
          userId,
          status: 'error',
          message: data.error || 'メッセージの送信に失敗しました',
        });
      }
    } catch (err) {
      setSendStatus({
        userId,
        status: 'error',
        message: 'エラーが発生しました',
      });
    } finally {
      setSendingTo(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-gray-600">読み込み中...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-50 text-red-800 p-4 rounded-md border border-red-200">
          エラー: {error}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">ユーザー管理</h1>
          <p className="text-gray-600 mt-2">
            総ユーザー数: {users.length}名
          </p>
        </div>

        {users.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">
              まだユーザーがいません。LINEボットにメッセージを送信してください。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="font-mono text-sm text-gray-600 break-all">
                      {user.line_user_id}
                    </div>
                    {user.display_name && (
                      <div className="text-lg font-medium text-gray-900 mt-1">
                        {user.display_name}
                      </div>
                    )}
                    <div className="text-sm text-gray-500 mt-1">
                      最終確認: {formatDate(user.last_seen_at)}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <input
                    type="text"
                    value={messageText[user.line_user_id] || ''}
                    onChange={(e) =>
                      setMessageText((prev) => ({
                        ...prev,
                        [user.line_user_id]: e.target.value,
                      }))
                    }
                    placeholder="メッセージを入力"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    disabled={sendingTo === user.line_user_id}
                  />
                  <button
                    onClick={() => sendMessage(user.line_user_id)}
                    disabled={sendingTo === user.line_user_id}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                  >
                    {sendingTo === user.line_user_id
                      ? '送信中...'
                      : 'メッセージを送信'}
                  </button>

                  {sendStatus?.userId === user.line_user_id && (
                    <div
                      className={`p-3 rounded-md text-sm ${
                        sendStatus.status === 'success'
                          ? 'bg-green-50 text-green-800 border border-green-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {sendStatus.message}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
