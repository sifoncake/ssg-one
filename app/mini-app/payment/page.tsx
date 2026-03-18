'use client';

import { useEffect, useState } from 'react';
import liff from '@line/liff';

type Store = {
  id: string;
  store_name: string;
};

type Product = {
  id: string;
  name: string;
  type: '施術' | '物販' | '回数券';
  price: number;
  tax_rate: number;
  store_id: string | null;
};

type CartItem = {
  id: string;
  itemName: string;
  itemType: '施術' | '物販' | '回数券';
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

const ITEM_TYPES = ['施術', '物販', '回数券'] as const;
const PAYMENT_METHODS = ['現金', 'カード', 'QRコード', '回数券'] as const;

const PAYMENT_METHOD_KEYS: Record<typeof PAYMENT_METHODS[number], string> = {
  '現金': 'cash',
  'カード': 'card',
  'QRコード': 'qr',
  '回数券': 'coupon',
};

export default function PaymentPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Item input
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState<typeof ITEM_TYPES[number]>('施術');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [taxRate, setTaxRate] = useState<number>(10);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<typeof PAYMENT_METHODS[number]>('現金');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

        const idToken = liff.getIDToken();
        const storesResponse = await fetch('/api/stores', {
          headers: { 'x-line-id-token': idToken || '' },
        });

        if (storesResponse.ok) {
          const storesData = await storesResponse.json();
          setStores(storesData.stores || []);
          if (storesData.stores?.length > 0) {
            const firstStoreId = storesData.stores[0].id;
            setSelectedStore(firstStoreId);
            await fetchProducts(idToken, firstStoreId);
          }
        }
      } catch (e) {
        console.error('Init error:', e);
        setError('初期化に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Fetch products when store changes
  useEffect(() => {
    if (!selectedStore) return;
    const idToken = liff.getIDToken();
    fetchProducts(idToken, selectedStore);
  }, [selectedStore]);

  const fetchProducts = async (idToken: string | null, storeId: string) => {
    if (!idToken) return;
    try {
      const response = await fetch(`/api/products?store_id=${storeId}`, {
        headers: { 'x-line-id-token': idToken },
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (e) {
      console.error('Failed to fetch products:', e);
    }
  };

  const handlePresetSelect = (product: Product) => {
    setItemName(product.name);
    setItemType(product.type);
    setUnitPrice(product.price);
    setTaxRate(product.tax_rate);
    setQuantity(1);
  };

  const handleAddToCart = () => {
    if (!itemName || unitPrice <= 0) {
      setError('商品名と金額を入力してください');
      return;
    }

    const newItem: CartItem = {
      id: Date.now().toString(),
      itemName,
      itemType,
      quantity,
      unitPrice,
      taxRate,
    };

    setCart([...cart, newItem]);
    setItemName('');
    setUnitPrice(0);
    setQuantity(1);
    setError(null);
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  };

  const handleSubmit = async () => {
    if (!selectedStore || cart.length === 0) {
      setError('商品をカートに追加してください');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const idToken = liff.getIDToken();

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineIdToken: idToken,
          storeId: selectedStore,
          paymentMethod,
          items: cart.map(item => ({
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

      const methodKey = PAYMENT_METHOD_KEYS[paymentMethod];
      const params = new URLSearchParams({
        saleId: data.sale?.id || '',
        amount: getCartTotal().toString(),
        method: paymentMethod,
      });
      window.location.href = `/mini-app/payment/flow/${methodKey}?${params.toString()}`;

    } catch (e) {
      console.error('Submit error:', e);
      setError('エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
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
    <main className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">💰 決済</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Cart */}
        {cart.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カート（{cart.length}点）
            </label>
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.itemName}</p>
                    <p className="text-xs text-gray-500">
                      {item.itemType} / {item.taxRate}% / ×{item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mr-2">
                    ¥{(item.unitPrice * item.quantity).toLocaleString()}
                  </p>
                  <button
                    onClick={() => handleRemoveFromCart(item.id)}
                    className="text-red-500 text-sm"
                  >
                    削除
                  </button>
                </div>
              ))}
              <div className="pt-2 border-t flex justify-between">
                <span className="font-medium">合計</span>
                <span className="font-bold text-lg">¥{getCartTotal().toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Product Selection */}
        {products.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">商品選択</label>
            <div className="grid grid-cols-2 gap-2">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handlePresetSelect(product)}
                  className={`p-2 rounded-lg border text-left text-sm ${
                    itemName === product.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-gray-500">¥{product.price.toLocaleString()}</p>
                </button>
              ))}
            </div>
          </div>
        )}

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

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">金額</label>
              <input
                type="number"
                value={unitPrice || ''}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                className="w-full border rounded-lg p-3 text-gray-900"
                placeholder="0"
              />
            </div>
            <div className="w-20">
              <label className="block text-sm font-medium text-gray-700 mb-2">数量</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                onFocus={(e) => e.target.select()}
                className="w-full border rounded-lg p-3 text-gray-900 text-center"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">税率</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTaxRate(10)}
                className={`flex-1 py-2 rounded-lg border ${
                  taxRate === 10
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-700'
                }`}
              >
                10%（標準）
              </button>
              <button
                onClick={() => setTaxRate(8)}
                className={`flex-1 py-2 rounded-lg border ${
                  taxRate === 8
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-700'
                }`}
              >
                8%（軽減）
              </button>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!itemName || unitPrice <= 0}
            className={`w-full py-3 rounded-lg font-medium ${
              !itemName || unitPrice <= 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-gray-800 text-white active:bg-gray-900'
            }`}
          >
            カートに追加
          </button>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-lg shadow-sm p-4">
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

      {/* Fixed Submit Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full py-4 rounded-lg text-white font-bold text-lg ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 active:bg-blue-700'
              }`}
            >
              {isSubmitting ? '登録中...' : `¥${getCartTotal().toLocaleString()} を登録`}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
