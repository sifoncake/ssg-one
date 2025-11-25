'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import { supabase, LINEUser } from '@/lib/supabase';

export default function UsersPage() {
  const [users, setUsers] = useState<LINEUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<LINEUser | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Auto-dismiss notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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

  const openMessageModal = (user: LINEUser) => {
    setSelectedUser(user);
    setMessageText('');
  };

  const closeMessageModal = () => {
    setSelectedUser(null);
    setMessageText('');
  };

  const sendMessage = async () => {
    if (!selectedUser || !messageText.trim()) {
      setNotification({
        type: 'error',
        message: 'メッセージを入力してください',
      });
      return;
    }

    setSending(true);

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
          userId: selectedUser.line_user_id,
          message: messageText,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNotification({
          type: 'success',
          message: `${selectedUser.display_name || selectedUser.line_user_id} にメッセージを送信しました`,
        });
        closeMessageModal();
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'メッセージの送信に失敗しました',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'エラーが発生しました',
      });
    } finally {
      setSending(false);
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

        {/* Notification Toast */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 animate-slide-in">
            <div
              className={`rounded-lg shadow-lg p-4 min-w-[300px] ${
                notification.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {notification.type === 'success' ? '✓' : '✗'}
                </span>
                <p
                  className={`text-sm font-medium ${
                    notification.type === 'success'
                      ? 'text-green-800'
                      : 'text-red-800'
                  }`}
                >
                  {notification.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {users.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">
              まだユーザーがいません。LINEボットにメッセージを送信してください。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition p-6"
              >
                <div className="mb-4">
                  {user.display_name && (
                    <div className="text-lg font-semibold text-gray-900 mb-1">
                      {user.display_name}
                    </div>
                  )}
                  <div className="font-mono text-xs text-gray-500 break-all">
                    {user.line_user_id}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    最終確認: {formatDate(user.last_seen_at)}
                  </div>
                </div>

                <button
                  onClick={() => openMessageModal(user)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition text-sm font-medium"
                >
                  📨 メッセージ送信
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Message Modal */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      メッセージ送信
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedUser.display_name || selectedUser.line_user_id}
                    </p>
                  </div>
                  <button
                    onClick={closeMessageModal}
                    className="text-gray-400 hover:text-gray-600 transition"
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

              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メッセージ内容
                  </label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="送信するメッセージを入力してください"
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    disabled={sending}
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    文字数: {messageText.length}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeMessageModal}
                    disabled={sending}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={sending || !messageText.trim()}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition text-sm font-medium"
                  >
                    {sending ? '送信中...' : '送信'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </AdminLayout>
  );
}
