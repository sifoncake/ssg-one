'use client';

/**
 * QRコードスキャン実装について
 *
 * LIFFには liff.scanCodeV2() というネイティブスキャナーがあるが、
 * html5-qrcode に統一している。理由:
 *
 * - コードがシンプルになる
 * - LINE内でも外部ブラウザでも同じ動作
 * - LIFF依存が減る
 * - 実用上の差は小さい（LIFF版は権限ポップアップなし・若干速い程度）
 */

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';

function QrFlowContent() {
  const searchParams = useSearchParams();

  const saleId = searchParams.get('saleId') || '';
  const amount = Number(searchParams.get('amount') || 0);
  const method = searchParams.get('method') || 'QRコード';

  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch {
        // Ignore
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleScan = async () => {
    if (!scannerRef.current) return;

    setError(null);
    setIsScanning(true);

    // Wait for DOM to update
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const scannerId = 'qr-scanner-container';

      // Clean up any existing scanner
      await stopScanner();

      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          setScannedCode(decodedText);
          stopScanner();
          setIsScanning(false);
        },
        () => {
          // Ignore continuous scan errors
        }
      );
    } catch (e) {
      console.error('Scan error:', e);
      setError('カメラの起動に失敗しました。カメラへのアクセスを許可してください。');
      setIsScanning(false);
    }
  };

  const handleStopScan = async () => {
    await stopScanner();
    setIsScanning(false);
  };

  const handleComplete = () => {
    const params = new URLSearchParams({ saleId, method });
    window.location.href = `/mini-app/payment/result?${params.toString()}`;
  };

  const handleRescan = () => {
    setScannedCode(null);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">📱 QRコード支払い</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">お会計</p>
          <p className="text-4xl font-bold text-gray-900">¥{amount.toLocaleString()}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6" ref={scannerRef}>
          {!scannedCode ? (
            <div className="text-center space-y-4">
              {/* Scanner container - always present */}
              <div
                id="qr-scanner-container"
                className={`w-full max-w-[300px] mx-auto ${isScanning ? '' : 'hidden'}`}
                style={{ minHeight: isScanning ? '300px' : '0' }}
              />

              {isScanning ? (
                <button
                  onClick={handleStopScan}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg"
                >
                  キャンセル
                </button>
              ) : (
                <>
                  <div className="w-24 h-24 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-5xl">📷</span>
                  </div>
                  <p className="text-gray-600">
                    お客様のQRコードをスキャンしてください
                  </p>
                  <button
                    onClick={handleScan}
                    className="w-full py-4 rounded-lg font-bold text-lg bg-green-600 text-white active:bg-green-700"
                  >
                    QRコードをスキャン
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-3xl">✓</span>
              </div>
              <p className="text-green-700 font-medium">QRコード読取完了</p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">読み取り内容</p>
                <p className="text-sm font-mono text-gray-700 break-all">
                  {scannedCode.length > 50
                    ? scannedCode.substring(0, 50) + '...'
                    : scannedCode}
                </p>
              </div>
              <button
                onClick={handleRescan}
                className="text-blue-600 text-sm underline"
              >
                再スキャン
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleComplete}
            disabled={!scannedCode}
            className={`w-full py-4 rounded-lg font-bold text-lg ${
              !scannedCode
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white active:bg-blue-700'
            }`}
          >
            {scannedCode ? '支払確認' : 'QRコードをスキャンしてください'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function QrFlowPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">読み込み中...</div>}>
      <QrFlowContent />
    </Suspense>
  );
}
