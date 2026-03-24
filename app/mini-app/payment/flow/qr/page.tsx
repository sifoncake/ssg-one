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
import { Html5Qrcode, Html5QrcodeResult } from 'html5-qrcode';
import jsQR from 'jsqr';

/**
 * 金種判定
 * QRコードの内容から決済サービスを判定する
 */
type PaymentProvider = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

const PAYMENT_PROVIDERS: Record<string, PaymentProvider> = {
  paypay: { id: 'paypay', name: 'PayPay', icon: '🔴', color: 'bg-red-500' },
  linepay: { id: 'linepay', name: 'LINE Pay', icon: '💚', color: 'bg-green-500' },
  rakuten: { id: 'rakuten', name: '楽天ペイ', icon: '🟤', color: 'bg-rose-600' },
  dbarai: { id: 'dbarai', name: 'd払い', icon: '🔵', color: 'bg-pink-500' },
  aupay: { id: 'aupay', name: 'au PAY', icon: '🟠', color: 'bg-orange-500' },
  merpay: { id: 'merpay', name: 'メルペイ', icon: '🔴', color: 'bg-red-400' },
  unknown: { id: 'unknown', name: '不明', icon: '❓', color: 'bg-gray-500' },
};

function detectPaymentProvider(qrValue: string): PaymentProvider {
  const lower = qrValue.toLowerCase();

  if (lower.includes('paypay.ne.jp') || lower.includes('paypay.co.jp')) {
    return PAYMENT_PROVIDERS.paypay;
  }
  if (lower.includes('line.me/pay') || lower.startsWith('line://pay')) {
    return PAYMENT_PROVIDERS.linepay;
  }
  if (lower.includes('pay.rakuten.co.jp') || lower.includes('r-pay')) {
    return PAYMENT_PROVIDERS.rakuten;
  }
  if (lower.includes('point.dcm') || lower.includes('d-card') || lower.includes('docomo')) {
    return PAYMENT_PROVIDERS.dbarai;
  }
  if (lower.includes('aupay') || lower.includes('auone.jp')) {
    return PAYMENT_PROVIDERS.aupay;
  }
  if (lower.includes('merpay') || lower.includes('mercari')) {
    return PAYMENT_PROVIDERS.merpay;
  }
  if (lower.startsWith('000201') || qrValue.includes('JPQR')) {
    return PAYMENT_PROVIDERS.unknown;
  }

  return PAYMENT_PROVIDERS.unknown;
}

type QrCorners = {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
};

function QrFlowContent() {
  const searchParams = useSearchParams();

  const saleId = searchParams.get('saleId') || '';
  const amount = Number(searchParams.get('amount') || 0);
  const method = searchParams.get('method') || 'QRコード';

  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [detectedProvider, setDetectedProvider] = useState<PaymentProvider | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsRescan, setNeedsRescan] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const handleScanRef = useRef<() => Promise<void>>(() => Promise.resolve());

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
    setFinalImage(null);

    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const scannerId = 'qr-scanner-container';
      await stopScanner();

      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText: string, decodedResult: Html5QrcodeResult) => {
          // ★ まずフレームを確保する（ビデオが次フレームに進む前に）
          const container = document.getElementById(scannerId);
          const videoElement = container?.querySelector('video') as HTMLVideoElement | null;

          let annotatedImage: string | null = null;
          let corners: QrCorners | null = null;
          if (videoElement && videoElement.readyState >= 2) {
            // フレームをキャプチャ
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');

            if (ctx) {
              ctx.drawImage(videoElement, 0, 0); // この時点でフレームを確定

              // 同じキャプチャフレームでjsQRを実行（タイミングずれなし）
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth', // 反転QRも検出対象に
              });

              if (code && code.data === decodedText) {
                // jsQRが同じQRコードを検出 → 同一フレームの正確な座標
                const { topLeftCorner: tl, topRightCorner: tr, bottomRightCorner: br, bottomLeftCorner: bl } = code.location;
                corners = { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl };
              }
              // jsQRが別のQRを検出 or 失敗した場合は枠なしで表示
              // （cornerPointsはqrbox座標系のため全体フレームに合わないので使わない）

              // 検出できた場合は枠を描画
              if (corners) {
                const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = corners;
                ctx.beginPath();
                ctx.moveTo(tl.x, tl.y);
                ctx.lineTo(tr.x, tr.y);
                ctx.lineTo(br.x, br.y);
                ctx.lineTo(bl.x, bl.y);
                ctx.closePath();
                ctx.strokeStyle = '#00FF00';
                ctx.lineWidth = 4;
                ctx.stroke();

                ctx.fillStyle = '#00FF00';
                for (const pt of [tl, tr, br, bl]) {
                  ctx.beginPath();
                  ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
                  ctx.fill();
                }
              }

              annotatedImage = canvas.toDataURL('image/png');
            }
          }

          // スキャナーを停止
          await stopScanner();
    
          if (!corners) {
            // 枠が引けない = どのQRを読んだか視覚確認できない → 再スキャンを促す
            if (annotatedImage) setFinalImage(annotatedImage);
            setNeedsRescan(true);
            return;
          }

          if (annotatedImage) {
            setFinalImage(annotatedImage);
            sessionStorage.setItem('qrCapturedImage', annotatedImage);
          }

          setScannedCode(decodedText);
          const provider = detectPaymentProvider(decodedText);
          setDetectedProvider(provider);
        },
        () => {
          // Ignore continuous scan errors
        }
      );
    } catch (e) {
      console.error('Scan error:', e);
      setError('カメラの起動に失敗しました。カメラへのアクセスを許可してください。');
    }
  };

  // handleScanRefを最新に保つ（useEffect内からstaleにならずに呼べるように）
  useEffect(() => {
    handleScanRef.current = handleScan;
  });

  // 画面表示時に自動でスキャン開始
  useEffect(() => {
    handleScanRef.current();
  }, []);

  // needsRescanがtrueになったら即座に自動再スキャン＋トースト表示
  useEffect(() => {
    if (!needsRescan) return;
    setNeedsRescan(false);
    setFinalImage(null);
    setToast('再読み込みします');
    handleScanRef.current();
  }, [needsRescan]);

  // トーストを2秒後に消す（needsRescanのサイクルとは独立）
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleStopScan = async () => {
    await stopScanner();
  };

  const handleComplete = () => {
    const params = new URLSearchParams({ saleId, method });
    if (detectedProvider) {
      params.set('provider', detectedProvider.id);
      params.set('providerName', detectedProvider.name);
    }
    window.location.href = `/mini-app/payment/result?${params.toString()}`;
  };

  const handleRescan = () => {
    setScannedCode(null);
    setDetectedProvider(null);
    setFinalImage(null);
    setError(null);
    sessionStorage.removeItem('qrCapturedImage');
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-32">
      {/* トースト */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none">
          {toast}
        </div>
      )}

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
              <div
                id="qr-scanner-container"
                className="w-full max-w-[300px] mx-auto"
                style={{ minHeight: '300px' }}
              />

              <button
                onClick={handleStopScan}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg"
              >
                キャンセル
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              {/* キャプチャ画像と検出位置表示 */}
              {finalImage ? (
                <div className="relative w-full max-w-[300px] mx-auto rounded-lg overflow-hidden">
                  <img
                    src={finalImage}
                    alt="検出したQRコード"
                    className="w-full h-auto"
                  />
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                    検出完了
                  </div>
                </div>
              ) : (
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">✓</span>
                </div>
              )}

              <p className="text-green-700 font-medium">QRコード読取完了</p>

              {/* 金種判定結果 */}
              {detectedProvider && (
                <div className={`${detectedProvider.color} text-white rounded-lg p-4`}>
                  <p className="text-sm opacity-90 mb-1">決済サービス</p>
                  <p className="text-2xl font-bold">
                    {detectedProvider.icon} {detectedProvider.name}
                  </p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">読み取り内容</p>
                <p className="text-sm font-mono text-gray-700 break-all">
                  {scannedCode.length > 80
                    ? scannedCode.substring(0, 80) + '...'
                    : scannedCode}
                </p>
              </div>

              {detectedProvider?.id === 'unknown' && (
                <p className="text-sm text-amber-600">
                  ※ 決済サービスを特定できませんでした
                </p>
              )}

              <button
                onClick={handleRescan}
                className="text-blue-600 text-sm underline"
              >
                再スキャン
              </button>
            </div>
          )}
        </div>

        {/* 本番では決済APIを叩く部分 */}
        {scannedCode && detectedProvider && detectedProvider.id !== 'unknown' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">※ ポートフォリオ版</p>
            <p>本番環境では、ここで {detectedProvider.name} API を呼び出して決済処理を行います。</p>
          </div>
        )}
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
