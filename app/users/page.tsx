'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, LINEUser } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

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

  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

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

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 text-red-800 p-4 rounded-md border border-red-200">
          エラー: {error}
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated
  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">LINE ユーザー管理</h1>
              <p className="text-sm text-gray-600 mt-1">{user.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-700 underline text-sm"
              >
                ← ホーム
              </Link>
              <button
                onClick={handleLogout}
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition text-sm"
              >
                ログアウト
              </button>
            </div>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              まだユーザーがいません。LINEボットにメッセージを送信してください。
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-mono text-sm text-gray-600 break-all">
                        {user.line_user_id}
                      </div>
                      {user.display_name && (
                        <div className="text-sm font-medium text-gray-900 mt-1">
                          {user.display_name}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        最終確認: {formatDate(user.last_seen_at)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      disabled={sendingTo === user.line_user_id}
                    />
                    <button
                      onClick={() => sendMessage(user.line_user_id)}
                      disabled={sendingTo === user.line_user_id}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition text-sm"
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
      </div>
    </main>
  );
}
