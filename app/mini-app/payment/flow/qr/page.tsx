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

type QrBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function QrFlowContent() {
  const searchParams = useSearchParams();

  const saleId = searchParams.get('saleId') || '';
  const amount = Number(searchParams.get('amount') || 0);
  const method = searchParams.get('method') || 'QRコード';

  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [detectedProvider, setDetectedProvider] = useState<PaymentProvider | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);
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

  // QR検出位置に枠を描画した画像を生成
  const createAnnotatedImage = (
    videoElement: HTMLVideoElement,
    boundingBox: QrBoundingBox | null
  ): string | null => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // ビデオフレームを描画
      ctx.drawImage(videoElement, 0, 0);

      // QR検出位置を描画
      if (boundingBox) {
        const padding = 10;
        const x = boundingBox.x - padding;
        const y = boundingBox.y - padding;
        const w = boundingBox.width + padding * 2;
        const h = boundingBox.height + padding * 2;

        // 枠線
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, w, h);

        // 角マーカー
        const markerSize = 20;
        ctx.fillStyle = '#00FF00';

        // 左上
        ctx.fillRect(x, y, markerSize, 6);
        ctx.fillRect(x, y, 6, markerSize);
        // 右上
        ctx.fillRect(x + w - markerSize, y, markerSize, 6);
        ctx.fillRect(x + w - 6, y, 6, markerSize);
        // 左下
        ctx.fillRect(x, y + h - 6, markerSize, 6);
        ctx.fillRect(x, y + h - markerSize, 6, markerSize);
        // 右下
        ctx.fillRect(x + w - markerSize, y + h - 6, markerSize, 6);
        ctx.fillRect(x + w - 6, y + h - markerSize, 6, markerSize);
      }

      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error('Failed to create annotated image:', e);
      return null;
    }
  };

  const handleScan = async () => {
    if (!scannerRef.current) return;

    setError(null);
    setIsScanning(true);
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
          // QRコードの位置情報を取得
          let boundingBox: QrBoundingBox | null = null;

          const result = decodedResult.result as { cornerPoints?: { x: number; y: number }[] };
          if (result.cornerPoints && result.cornerPoints.length >= 4) {
            const points = result.cornerPoints;
            const minX = Math.min(...points.map(p => p.x));
            const maxX = Math.max(...points.map(p => p.x));
            const minY = Math.min(...points.map(p => p.y));
            const maxY = Math.max(...points.map(p => p.y));

            boundingBox = {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY,
            };
          }

          // ビデオ要素を取得してキャプチャ
          // html5-qrcodeはコンテナ内にvideoを生成する
          const container = document.getElementById(scannerId);
          const videoElement = container?.querySelector('video') as HTMLVideoElement | null;

          if (videoElement && videoElement.readyState >= 2) {
            const annotatedImage = createAnnotatedImage(videoElement, boundingBox);
            if (annotatedImage) {
              setFinalImage(annotatedImage);
              // 結果画面で使うためにsessionStorageに保存
              sessionStorage.setItem('qrCapturedImage', annotatedImage);
            }
          }

          setScannedCode(decodedText);
          const provider = detectPaymentProvider(decodedText);
          setDetectedProvider(provider);

          // スキャナーを停止
          await stopScanner();
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
