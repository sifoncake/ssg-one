'use client';

import { useEffect, useState } from 'react';
import liff from '@line/liff';

type CartItem = {
  id: string;
  itemName: string;
  itemType: '施術' | '物販' | '回数券';
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

type CartData = {
  storeId: string;
  cart: CartItem[];
  total: number;
};

const PAYMENT_METHODS = ['現金', 'カード', 'QRコード', '回数券'] as const;

const PAYMENT_METHOD_KEYS: Record<typeof PAYMENT_METHODS[number], string> = {
  '現金': 'cash',
  'カード': 'card',
  'QRコード': 'qr',
  '回数券': 'coupon',
};

export default function PaymentMethodPage() {
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load cart from sessionStorage
    const saved = sessionStorage.getItem('paymentCart');
    if (!saved) {
      window.location.href = '/mini-app/payment';
      return;
    }

    try {
      const data = JSON.parse(saved) as CartData;
      if (!data.cart || data.cart.length === 0) {
        window.location.href = '/mini-app/payment';
        return;
      }
      setCartData(data);
    } catch {
      window.location.href = '/mini-app/payment';
    }
  }, []);

  const handlePaymentSelect = async (method: typeof PAYMENT_METHODS[number]) => {
    if (!cartData) return;

    setIsSubmitting(true);
    setError(null);

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

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineIdToken: idToken,
          storeId: cartData.storeId,
          paymentMethod: method,
          items: cartData.cart.map(item => ({
            itemName: item.itemName,
            itemType: item.itemType,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '登録に失敗しました');
        return;
      }

      // Clear cart from sessionStorage
      sessionStorage.removeItem('paymentCart');

      const methodKey = PAYMENT_METHOD_KEYS[method];
      const params = new URLSearchParams({
        saleId: data.sale?.id || '',
        amount: cartData.total.toString(),
        method,
      });
      window.location.href = `/mini-app/payment/flow/${methodKey}?${params.toString()}`;

    } catch (e) {
      console.error('Submit error:', e);
      setError('エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    window.location.href = '/mini-app/payment';
  };

  if (!cartData) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center">
          <button
            onClick={handleBack}
            className="mr-3 text-gray-600"
          >
            ←
          </button>
          <h1 className="text-lg font-bold text-gray-900">💰 お支払い方法</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Cart Summary */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            ご購入内容（{cartData.cart.length}点）
          </p>
          <div className="space-y-2">
            {cartData.cart.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.itemName} ×{item.quantity}
                </span>
                <span className="text-gray-900 font-medium">
                  ¥{(item.unitPrice * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
            <div className="pt-2 border-t flex justify-between">
              <span className="font-medium">合計</span>
              <span className="font-bold text-xl text-blue-600">
                ¥{cartData.total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">
            お支払い方法を選択してください
          </p>
          <div className="space-y-3">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method}
                onClick={() => handlePaymentSelect(method)}
                disabled={isSubmitting}
                className={`w-full py-4 rounded-lg border-2 text-lg font-medium transition-colors ${
                  isSubmitting
                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100'
                }`}
              >
                {method === '現金' && '💴 '}
                {method === 'カード' && '💳 '}
                {method === 'QRコード' && '📱 '}
                {method === '回数券' && '🎟️ '}
                {method}
              </button>
            ))}
          </div>
        </div>

        {isSubmitting && (
          <div className="text-center text-gray-500">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
            登録中...
          </div>
        )}
      </div>
    </main>
  );
}
