'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

function CashFlowContent() {
  const searchParams = useSearchParams();

  const saleId = searchParams.get('saleId') || '';
  const amount = Number(searchParams.get('amount') || 0);
  const method = searchParams.get('method') || '現金';

  const [received, setReceived] = useState<number>(0);
  const change = received - amount;

  const handleComplete = () => {
    const params = new URLSearchParams({ saleId, method });
    window.location.href = `/mini-app/payment/result?${params.toString()}`;
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">💴 現金支払い</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">お会計</p>
          <p className="text-4xl font-bold text-gray-900">¥{amount.toLocaleString()}</p>
        </div>

        {/* お釣り計算 */}
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">お預かり金額</label>
            <input
              type="number"
              value={received || ''}
              onChange={(e) => setReceived(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              className="w-full border rounded-lg p-3 text-gray-900 text-right text-xl"
              placeholder="0"
            />
          </div>

          {received >= amount && (
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-600 mb-1">お釣り</p>
              <p className="text-3xl font-bold text-blue-900">¥{change.toLocaleString()}</p>
            </div>
          )}

          {received > 0 && received < amount && (
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-sm text-red-600">¥{(amount - received).toLocaleString()} 不足しています</p>
            </div>
          )}
        </div>

        {/* クイック金額ボタン */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">クイック選択</p>
          <div className="grid grid-cols-3 gap-2">
            {[1000, 5000, 10000].map((val) => (
              <button
                key={val}
                onClick={() => setReceived(val)}
                className="py-2 border border-gray-200 rounded-lg text-gray-700 text-sm"
              >
                ¥{val.toLocaleString()}
              </button>
            ))}
            {[Math.ceil(amount / 1000) * 1000].map((val) => (
              val !== 1000 && val !== 5000 && val !== 10000 ? (
                <button
                  key={val}
                  onClick={() => setReceived(val)}
                  className="py-2 border border-blue-300 bg-blue-50 rounded-lg text-blue-700 text-sm col-span-3"
                >
                  ちょうど ¥{val.toLocaleString()}
                </button>
              ) : null
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleComplete}
            disabled={received < amount}
            className={`w-full py-4 rounded-lg text-white font-bold text-lg ${
              received < amount
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 active:bg-blue-700'
            }`}
          >
            {received < amount ? 'お預かり金額を入力してください' : '完了'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function CashFlowPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">読み込み中...</div>}>
      <CashFlowContent />
    </Suspense>
  );
}
