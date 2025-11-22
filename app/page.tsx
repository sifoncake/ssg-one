'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { saveFingerprint } from '@/lib/fingerprint';

export default function Home() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const { user, loading: authLoading } = useAuth();

  // Save device fingerprint on mount
  useEffect(() => {
    saveFingerprint();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      // Use NEXT_PUBLIC_API_URL if set (for Lambda), otherwise use local API route
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/send-line';

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
          message: 'Message sent successfully!',
        });
        setMessage('');
      } else {
        setStatus({
          type: 'error',
          message: data.error || 'Failed to send message',
        });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'An error occurred while sending the message',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">
              SSG ONE - LINE Messenger
            </h1>

            {!authLoading && (
              <div className="flex items-center justify-center gap-3 text-sm">
                {user ? (
                  <>
                    <span className="text-gray-600">ログイン中: {user.email}</span>
                    <Link
                      href="/users"
                      className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
                    >
                      ユーザー管理 →
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      ログイン
                    </Link>
                    <span className="text-gray-400">|</span>
                    <Link
                      href="/signup"
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      新規登録
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Message
              </label>
              <input
                type="text"
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>

          {status.type && (
            <div
              className={`mt-4 p-4 rounded-md ${
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
    </main>
  );
}
