'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import { supabase } from '@/lib/supabase';

interface Customer {
  id: string;
  customer_code: string;
  name: string;
  email: string;
  phone: string;
  first_visit_date: string;
  last_visit_date: string;
  total_visits: number;
  total_spent: number;
  customer_type: string;
  notes: string;
  primary_store: {
    store_name: string;
  }[];
  store_history: {
    stores: {
      store_name: string;
    }[];
    visit_count: number;
    total_spent: number;
  }[];
}

const CUSTOMER_TYPE_DISPLAY: Record<string, { ja: string; color: string }> = {
  vip: { ja: 'VIP顧客', color: 'bg-yellow-100 text-yellow-800' },
  'multi-store': { ja: '複数店舗', color: 'bg-blue-100 text-blue-800' },
  regular: { ja: '常連顧客', color: 'bg-green-100 text-green-800' },
  new: { ja: '新規顧客', color: 'bg-gray-100 text-gray-800' },
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      // Fetch customers with primary store
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select(`
          id,
          customer_code,
          name,
          email,
          phone,
          first_visit_date,
          last_visit_date,
          total_visits,
          total_spent,
          customer_type,
          notes,
          primary_store:stores!customers_primary_store_id_fkey(store_name)
        `)
        .order('total_spent', { ascending: false });

      if (customersError) throw customersError;

      // Fetch store history for all customers
      const { data: historyData, error: historyError } = await supabase
        .from('customer_store_history')
        .select(`
          customer_id,
          visit_count,
          total_spent,
          stores!store_id(store_name)
        `);

      if (historyError) throw historyError;

console.log('Customers raw data:', customersData);
console.log('History raw data:', historyData);

      // Combine data
      const combinedData = (customersData || []).map((customer) => {
        const customerHistory = (historyData || []).filter(
          (h: any) => h.customer_id === customer.id
        );

        return {
          ...customer,
          store_history: customerHistory,
        };
      });

      setCustomers(combinedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const toggleExpand = (customerId: string) => {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-gray-600">読み込み中...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-50 text-red-800 p-4 rounded-md border border-red-200">
          エラー: {error}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">顧客管理</h1>
          <p className="text-gray-600 mt-2">総顧客数: {customers.length}名</p>
        </div>

        {customers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">顧客データがありません。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition p-6"
              >
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        CUSTOMER_TYPE_DISPLAY[customer.customer_type]?.color ||
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {CUSTOMER_TYPE_DISPLAY[customer.customer_type]?.ja || customer.customer_type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{customer.customer_code}</p>
                  <div className="flex items-center gap-4 text-sm mt-3">
                    <div className="flex items-center gap-1">
                      <span className="text-2xl">🎯</span>
                      <span className="font-medium text-gray-700">{customer.total_visits}回</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-2xl">💰</span>
                      <span className="font-medium text-gray-700">
                        {formatCurrency(customer.total_spent)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  {customer.primary_store && customer.primary_store.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">🏢</span>
                      <span className="truncate">{customer.primary_store[0].store_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">📧</span>
                    <span className="truncate">{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">📞</span>
                    <span>{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">🗓️</span>
                    <span>初回: {formatDate(customer.first_visit_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">📅</span>
                    <span>最終: {formatDate(customer.last_visit_date)}</span>
                  </div>
                </div>

                {customer.notes && (
                  <div className="mb-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 line-clamp-2">{customer.notes}</p>
                  </div>
                )}

                {customer.store_history.length > 1 && (
                  <div className="pt-4 border-t border-gray-100">
                    <button
                      onClick={() => toggleExpand(customer.id)}
                      className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-between"
                    >
                      <span>店舗別利用状況</span>
                      <span>{expandedCustomer === customer.id ? '▼' : '▶'}</span>
                    </button>

                    {expandedCustomer === customer.id && (
                      <div className="mt-3 space-y-2">
                        {customer.store_history.map((history, index) => (
                          <div
                            key={index}
                            className="text-xs bg-gray-50 rounded p-2 flex justify-between"
                          >
                            <span className="font-medium">
                              {history.stores?.[0]?.store_name || '不明'}
                            </span>
                            <div className="text-gray-600">
                              <span className="mr-3">{history.visit_count}回</span>
                              <span>{formatCurrency(history.total_spent)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
