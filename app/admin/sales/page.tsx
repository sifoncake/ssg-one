'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import { supabase } from '@/lib/supabase';

// Raw Supabase response types
interface SupabaseStore {
  store_name: string;
}

interface SupabaseCustomer {
  name: string;
}

interface SupabaseStaff {
  name: string;
}

interface SupabaseSaleItem {
  item_name: string;
  item_type: string;
  quantity: number;
  amount: number;
}

interface SupabaseSale {
  id: string;
  sale_code: string;
  date: string;
  total_amount: number;
  payment_method: string;
  status: string;
  stores: SupabaseStore | SupabaseStore[] | null;
  customers: SupabaseCustomer | SupabaseCustomer[] | null;
  staff: SupabaseStaff | SupabaseStaff[] | null;
  sale_items: SupabaseSaleItem[];
}

// Formatted types for component state
interface Sale {
  id: string;
  sale_code: string;
  date: string;
  store_name: string;
  customer_name: string;
  staff_name: string;
  item_summary: string;
  amount: number;
  payment_method: string;
  status: string;
}

interface MonthlyStats {
  month: string;
  revenue: number;
  stores: { [storeName: string]: number };
}

interface Store {
  id: string;
  store_name: string;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    storeId: '',
  });

  useEffect(() => {
    fetchSales();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sales, filters]);

  const fetchSales = async () => {
    try {
      setLoading(true);

      // Fetch stores
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, store_name')
        .order('store_name');

      if (storesError) throw storesError;
      setStores(storesData || []);

      // Fetch sales with store, customer, staff names, and items
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          sale_code,
          date,
          total_amount,
          payment_method,
          status,
          stores!store_id(store_name),
          customers!customer_id(name),
          staff!staff_id(name),
          sale_items(item_name, item_type, quantity, amount)
        `)
        .order('date', { ascending: false });

      if (salesError) throw salesError;

      const typedSales = salesData as SupabaseSale[];
      const formattedSales: Sale[] = typedSales.map((sale) => {
        const stores = Array.isArray(sale.stores) ? sale.stores[0] : sale.stores;
        const customers = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
        const staff = Array.isArray(sale.staff) ? sale.staff[0] : sale.staff;

        // Create item summary (e.g., "60分コース x2, オイル x1")
        const itemSummary = sale.sale_items
          ?.map(item => item.quantity > 1 ? `${item.item_name} x${item.quantity}` : item.item_name)
          .join(', ') || '-';

        return {
          id: sale.id,
          sale_code: sale.sale_code,
          date: sale.date,
          store_name: stores?.store_name || '不明',
          customer_name: customers?.name || 'ゲスト',
          staff_name: staff?.name || '不明',
          item_summary: itemSummary,
          amount: sale.total_amount,
          payment_method: sale.payment_method,
          status: sale.status,
        };
      });

      setSales(formattedSales);

      // Calculate monthly stats
      const stats = calculateMonthlyStats(formattedSales);
      setMonthlyStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyStats = (salesData: Sale[]): MonthlyStats[] => {
    const monthMap: { [key: string]: { total: number; stores: { [storeName: string]: number } } } = {};

    salesData.forEach((sale) => {
      const month = sale.date.substring(0, 7); // YYYY-MM
      if (!monthMap[month]) {
        monthMap[month] = { total: 0, stores: {} };
      }
      monthMap[month].total += sale.amount;
      monthMap[month].stores[sale.store_name] = (monthMap[month].stores[sale.store_name] || 0) + sale.amount;
    });

    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, revenue: data.total, stores: data.stores }));
  };

  const applyFilters = () => {
    let filtered = [...sales];

    if (filters.startDate) {
      filtered = filtered.filter((sale) => sale.date >= filters.startDate);
    }

    if (filters.endDate) {
      filtered = filtered.filter((sale) => sale.date <= filters.endDate);
    }

    if (filters.storeId) {
      const selectedStore = stores.find((s) => s.id === filters.storeId);
      if (selectedStore) {
        filtered = filtered.filter((sale) => sale.store_name === selectedStore.store_name);
      }
    }

    setFilteredSales(filtered);
  };

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.amount, 0);

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

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    return `${year}年${month}月`;
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">売上管理</h1>
        </div>

        {/* Total Revenue Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-2">総売上（フィルター適用後）</p>
              <p className="text-4xl font-bold">{formatCurrency(totalRevenue)}</p>
              <p className="text-blue-100 text-sm mt-2">{filteredSales.length}件の取引</p>
            </div>
            <div className="text-6xl">💰</div>
          </div>
        </div>

        {/* Monthly Stats Chart */}
        {monthlyStats.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">月別売上推移（店舗別）</h2>
            <div className="space-y-4">
              {monthlyStats.map((stat) => {
                const maxRevenue = Math.max(...monthlyStats.map((s) => s.revenue));
                const storeColors: { [key: string]: string } = {
                  '渋谷店': 'bg-blue-600',
                  '新宿店': 'bg-green-600',
                  '池袋店': 'bg-purple-600',
                };

                return (
                  <div key={stat.month}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{formatMonth(stat.month)}</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(stat.revenue)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden flex">
                      {Object.entries(stat.stores).map(([storeName, storeRevenue], idx) => {
                        const storePercentage = (storeRevenue / stat.revenue) * 100;
                        const colorClass = storeColors[storeName] || `bg-gray-${400 + idx * 100}`;
                        return (
                          <div
                            key={storeName}
                            className={`${colorClass} h-4 transition-all duration-300`}
                            style={{ width: `${storePercentage}%` }}
                            title={`${storeName}: ${formatCurrency(storeRevenue)}`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex gap-3 mt-2 text-xs text-gray-600">
                      {Object.entries(stat.stores).map(([storeName, storeRevenue]) => (
                        <div key={storeName} className="flex items-center gap-1">
                          <span className={`w-3 h-3 rounded ${storeColors[storeName] || 'bg-gray-400'}`} />
                          <span>{storeName}: {formatCurrency(storeRevenue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">フィルター</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                店舗
              </label>
              <select
                value={filters.storeId}
                onChange={(e) => setFilters({ ...filters, storeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">全店舗</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.store_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                開始日
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                終了日
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    日付
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    店舗
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    顧客名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    担当
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    商品
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    支払方法
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状態
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      該当するデータがありません
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(sale.date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {sale.store_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {sale.customer_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {sale.staff_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {sale.item_summary}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {sale.payment_method}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            sale.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : sale.status === 'voided'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {sale.status === 'completed' ? '完了' : sale.status === 'voided' ? '取消' : '返金'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {formatCurrency(sale.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
