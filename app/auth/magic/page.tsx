'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFingerprintOrCreate } from '@/lib/fingerprint';
import { supabase } from '@/lib/supabase';
import liff from '@line/liff';

type VerificationState = 'loading' | 'requires_2fa' | 'success' | 'error';

function MagicLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<VerificationState>('loading');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [lineIdToken, setLineIdToken] = useState<string | null>(null);
  const [liffInitDone, setLiffInitDone] = useState(false);
  const [canShowError, setCanShowError] = useState(false);

  // Track if verification has been attempted to prevent multiple calls
  const hasVerified = useRef(false);
  const hasInitLiff = useRef(false);

  useEffect(() => {
    // LIFF is only useful in LINE in-app browser. On PC/regular browsers we simply won't have a token.
    const init = async () => {
      if (hasInitLiff.current) return;
      hasInitLiff.current = true;

      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        setLiffInitDone(true);
        return;
      }

      try {
        await liff.init({ liffId });

        // If we're not inside LINE, don't force login; PC flow should require 2FA anyway.
        if (!liff.isInClient()) {
          setLiffInitDone(true);
          return;
        }

        if (!liff.isLoggedIn()) {
          // This will redirect within LINE in-app browser.
          // Don't set liffInitDone here - we're about to redirect
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const idToken = liff.getIDToken();
        if (idToken) setLineIdToken(idToken);
        setLiffInitDone(true);
      } catch (e) {
        console.warn('LIFF init failed (fallback to 2FA flow):', e);
        setLiffInitDone(true);
      }
    };

    void init();
  }, []);

  useEffect(() => {
    // Wait until LIFF init attempt completes before any checks
    if (!liffInitDone) return;

    if (!token) {
      setCanShowError(true);
      setState('error');
      setError('Invalid magic link - no token provided');
      return;
    }

    // Only verify once
    if (hasVerified.current) return;
    hasVerified.current = true;

    void verifyToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, liffInitDone]);

  const verifyToken = async (code?: string) => {
    try {
      setVerifying(true);
      setError(null);

      const fingerprint = getFingerprintOrCreate();
      console.log('Verifying with fingerprint:', fingerprint);

      const response = await fetch('/api/auth/verify-magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          twoFactorCode: code || '',
          fingerprint,
          lineIdToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      if (data.requiresTwoFactor) {
        setState('requires_2fa');
        setVerifying(false);
        return;
      }

      if (data.success && data.lineUserId && data.email) {
        // Verification successful - create Supabase session using admin email
        console.log('Magic link verified for LINE user:', data.lineUserId);
        console.log('Admin email:', data.email);

        // Call our API to generate a session token using Supabase Admin API
        const sessionResponse = await fetch('/api/auth/create-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.email,
          }),
        });

        const sessionData = await sessionResponse.json();

        if (!sessionResponse.ok || !sessionData.success) {
          throw new Error(sessionData.error || 'Failed to create session');
        }

        // Verify the hashed token to create the session
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: sessionData.hashed_token,
          type: 'magiclink',
        });

        if (verifyError) {
          console.error('Failed to verify token:', verifyError);
          throw new Error('Failed to create session: ' + verifyError.message);
        }

        console.log('Session created successfully for:', sessionData.email);
        setState('success');

        // Redirect to users page after 1 second
        setTimeout(() => {
          router.push('/users');
        }, 1000);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setCanShowError(true);
      setState('error');
      setError(err instanceof Error ? err.message : 'Verification failed');
      setVerifying(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.length !== 6) {
      setError('6桁のコードを入力してください');
      return;
    }
    // Allow re-verification with 2FA code (not counted as duplicate)
    await verifyToken(twoFactorCode);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            🔐 管理画面アクセス
          </h1>

          {(state === 'loading' || (state === 'error' && !canShowError)) && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">認証中...</p>
            </div>
          )}

          {state === 'requires_2fa' && (
            <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                <p className="text-sm text-blue-800">
                  別のデバイスからのアクセスが検出されました。
                  <br />
                  LINEで送信された6桁の2段階認証コードを入力してください。
                </p>
              </div>

              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  2段階認証コード
                </label>
                <input
                  type="text"
                  id="code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-center text-2xl tracking-widest"
                  disabled={verifying}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={verifying || twoFactorCode.length !== 6}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {verifying ? '確認中...' : '確認'}
              </button>
            </form>
          )}

          {state === 'success' && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✓</div>
              <p className="text-green-800 font-medium mb-2">認証成功！</p>
              <p className="text-gray-600 text-sm">管理画面にリダイレクトしています...</p>
            </div>
          )}

          {state === 'error' && canShowError && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✗</div>
              <p className="text-red-800 font-medium mb-4">認証エラー</p>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              <button
                onClick={() => router.push('/')}
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition"
              >
                ホームに戻る
              </button>
            </div>
          )}

          {error && state === 'requires_2fa' && (
            <div className="mt-4 p-4 rounded-md bg-red-50 text-red-800 border border-red-200">
              {error}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                🔐 管理画面アクセス
              </h1>
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">読み込み中...</p>
              </div>
            </div>
          </div>
        </main>
      }
    >
      <MagicLinkContent />
    </Suspense>
  );
}
