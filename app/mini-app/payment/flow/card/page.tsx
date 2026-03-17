'use client';

import { useSearchParams } from 'next/navigation';

export default function CardFlowPage() {
  const searchParams = useSearchParams();

  const saleId = searchParams.get('saleId') || '';
  const amount = Number(searchParams.get('amount') || 0);
  const method = searchParams.get('method') || 'カード';

  const handleComplete = () => {
    const params = new URLSearchParams({ saleId, amount: amount.toString(), method });
    window.location.href = `/mini-app/payment/complete?${params.toString()}`;
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">💳 カード支払い</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">お会計</p>
          <p className="text-4xl font-bold text-gray-900">¥{amount.toLocaleString()}</p>
        </div>

        {/* TODO: カード決済端末との連携UIをここに追加 */}
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-500">カードをお通しください</p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleComplete}
            className="w-full py-4 rounded-lg text-white font-bold text-lg bg-blue-600 active:bg-blue-700"
          >
            決済完了
          </button>
        </div>
      </div>
    </main>
  );
}
