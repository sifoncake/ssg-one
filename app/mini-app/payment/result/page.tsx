'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import liff from '@line/liff';

type SaleItem = {
  item_name: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

type SaleDetail = {
  id: string;
  sale_code: string;
  total_amount: number;
  payment_method: string;
  items: SaleItem[];
};

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const saleId = searchParams.get('saleId') || '';
  const method = searchParams.get('method') || '';

  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSaleDetail = async () => {
      if (!saleId) {
        setError('売上IDが見つかりません');
        setLoading(false);
        return;
      }

      try {
        const liffId = process.env.NEXT_PUBLIC_MINI_APP_LIFF_ID;
        if (!liffId) {
          throw new Error('LIFF ID not configured');
        }

        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const idToken = liff.getIDToken();
        const response = await fetch(`/api/sales/${saleId}`, {
          headers: { 'x-line-id-token': idToken || '' },
        });

        if (!response.ok) {
          throw new Error('売上データの取得に失敗しました');
        }

        const data = await response.json();
        setSale(data.sale);
      } catch (e) {
        console.error('Failed to fetch sale:', e);
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchSaleDetail();
  }, [saleId]);

  const handleComplete = () => {
    window.location.href = '/mini-app/payment/complete';
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </main>
    );
  }

  if (error || !sale) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md w-full">
          <p className="text-red-800">{error || 'エラーが発生しました'}</p>
          <button
            onClick={() => window.location.href = '/mini-app/payment'}
            className="mt-4 w-full py-2 bg-gray-600 text-white rounded-lg"
          >
            決済画面に戻る
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">📋 決済結果</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Sale Code */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">伝票番号</p>
          <p className="text-sm font-mono text-gray-700">{sale.sale_code}</p>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">明細</p>
          <div className="space-y-3">
            {sale.items.map((item, index) => (
              <div key={index} className="flex justify-between items-start border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.item_name}</p>
                  <p className="text-sm text-gray-500">
                    ¥{item.unit_price.toLocaleString()} × {item.quantity}
                  </p>
                </div>
                <p className="font-medium text-gray-900">
                  ¥{item.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-blue-600">合計金額</p>
            <p className="text-2xl font-bold text-blue-900">
              ¥{sale.total_amount.toLocaleString()}
            </p>
          </div>
          <p className="text-sm text-blue-600 mt-1">支払方法: {method || sale.payment_method}</p>
        </div>
      </div>

      {/* Fixed Complete Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleComplete}
            className="w-full py-4 rounded-lg bg-blue-600 text-white font-bold text-lg active:bg-blue-700"
          >
            完了
          </button>
        </div>
      </div>
    </main>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">読み込み中...</div>}>
      <PaymentResultContent />
    </Suspense>
  );
}
