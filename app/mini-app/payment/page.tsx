'use client';

import { useEffect, useState } from 'react';
import liff from '@line/liff';

type Store = {
  id: string;
  store_name: string;
};

const ITEM_TYPES = ['施術', '物販', '回数券'] as const;
const PAYMENT_METHODS = ['現金', 'カード', 'QRコード', '回数券'] as const;

// Preset items for quick selection
const PRESET_ITEMS = [
  { name: '60分コース', type: '施術', price: 6000 },
  { name: '90分コース', type: '施術', price: 8500 },
  { name: '120分コース', type: '施術', price: 11000 },
  { name: 'オイル', type: '物販', price: 3000 },
  { name: '回数券5回', type: '回数券', price: 27500 },
];

export default function PaymentPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState<typeof ITEM_TYPES[number]>('施術');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<typeof PAYMENT_METHODS[number]>('現金');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [todaySummary, setTodaySummary] = useState<{ totalAmount: number; transactionCount: number } | null>(null);

  useEffect(() => {
    const init = async () => {
      const liffId = process.env.NEXT_PUBLIC_MINI_APP_LIFF_ID;
      if (!liffId) {
        setError('LIFF IDが設定されていません');
        setIsLoading(false);
        return;
      }

      try {
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        // Fetch stores
        const idToken = liff.getIDToken();
        const storesResponse = await fetch('/api/stores', {
          headers: { 'x-line-id-token': idToken || '' },
        });

        if (storesResponse.ok) {
          const storesData = await storesResponse.json();
          setStores(storesData.stores || []);
          if (storesData.stores?.length > 0) {
            setSelectedStore(storesData.stores[0].id);
          }
        }

        // Fetch today's summary
        await fetchTodaySummary(idToken);
      } catch (e) {
        console.error('Init error:', e);
        setError('初期化に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const fetchTodaySummary = async (idToken: string | null) => {
    if (!idToken) return;
    try {
      const response = await fetch('/api/sales', {
        headers: { 'x-line-id-token': idToken },
      });
      if (response.ok) {
        const data = await response.json();
        setTodaySummary({
          totalAmount: data.totalAmount,
          transactionCount: data.transactionCount,
        });
      }
    } catch (e) {
      console.error('Failed to fetch summary:', e);
    }
  };

  const handlePresetSelect = (preset: typeof PRESET_ITEMS[number]) => {
    setItemName(preset.name);
    setItemType(preset.type as typeof ITEM_TYPES[number]);
    setUnitPrice(preset.price);
  };

  const handleSubmit = async () => {
    if (!selectedStore || !itemName || unitPrice <= 0) {
      setError('必須項目を入力してください');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const idToken = liff.getIDToken();

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineIdToken: idToken,
          storeId: selectedStore,
          itemName,
          itemType,
          quantity: 1,
          unitPrice,
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '登録に失敗しました');
        return;
      }

      setSuccessMessage(`¥${unitPrice.toLocaleString()} の売上を登録しました`);

      // Reset form
      setItemName('');
      setUnitPrice(0);

      // Refresh summary
      await fetchTodaySummary(idToken);

    } catch (e) {
      console.error('Submit error:', e);
      setError('エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    window.location.href = '/mini-app';
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center">
          <button onClick={handleBack} className="mr-3 text-gray-600">
            ← 戻る
          </button>
          <h1 className="text-lg font-bold text-gray-900">💰 決済</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Today's Summary */}
        {todaySummary && (
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 mb-1">本日の売上</p>
            <p className="text-2xl font-bold text-blue-900">
              ¥{todaySummary.totalAmount.toLocaleString()}
            </p>
            <p className="text-sm text-blue-600">{todaySummary.transactionCount}件</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Store Selection */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">店舗</label>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="w-full border rounded-lg p-3 text-gray-900"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.store_name}
              </option>
            ))}
          </select>
        </div>

        {/* Preset Items */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">クイック選択</label>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_ITEMS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetSelect(preset)}
                className={`p-2 rounded-lg border text-left text-sm ${
                  itemName === preset.name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-gray-900">{preset.name}</p>
                <p className="text-gray-500">¥{preset.price.toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Input */}
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">商品名</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full border rounded-lg p-3 text-gray-900"
              placeholder="商品名を入力"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">種類</label>
            <div className="flex gap-2">
              {ITEM_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setItemType(type)}
                  className={`flex-1 py-2 rounded-lg border ${
                    itemType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">金額</label>
            <input
              type="number"
              value={unitPrice || ''}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
              className="w-full border rounded-lg p-3 text-gray-900 text-xl"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">支払方法</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 rounded-lg border ${
                    paymentMethod === method
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !itemName || unitPrice <= 0}
          className={`w-full py-4 rounded-lg text-white font-bold text-lg ${
            isSubmitting || !itemName || unitPrice <= 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 active:bg-blue-700'
          }`}
        >
          {isSubmitting ? '登録中...' : `¥${unitPrice.toLocaleString()} を登録`}
        </button>
      </div>
    </main>
  );
}
