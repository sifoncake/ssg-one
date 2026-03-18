'use client';

export default function PaymentCompletePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-4xl">✓</span>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">会計完了</h1>
          <p className="text-gray-500">ありがとうございました</p>
        </div>
      </div>

      <div className="p-4 space-y-3 max-w-md mx-auto w-full">
        <button
          onClick={() => { window.location.href = '/mini-app/payment'; }}
          className="w-full py-4 rounded-lg bg-blue-600 text-white font-bold text-lg active:bg-blue-700"
        >
          次の会計へ
        </button>
        <button
          onClick={() => { window.location.href = '/mini-app'; }}
          className="w-full py-3 rounded-lg border border-gray-300 text-gray-700 font-medium active:bg-gray-50"
        >
          ホームへ戻る
        </button>
      </div>
    </main>
  );
}
