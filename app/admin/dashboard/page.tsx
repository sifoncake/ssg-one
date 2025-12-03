'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import { supabase } from '@/lib/supabase';

// Raw Supabase response types
interface SupabaseSalesAmount {
  amount: number;
}

interface SupabaseStoreData {
  id: string;
  store_name: string;
  monthly_target: number;
}

interface SupabaseMonthlySale {
  store_id: string;
  amount: number;
}

interface SupabaseCustomer {
  name: string;
}

interface SupabaseStore {
  store_name: string;
}

interface SupabaseRecentSale {
  id: string;
  date: string;
  amount: number;
  customers: SupabaseCustomer;
  stores: SupabaseStore;
}

// Formatted types for component state
interface StoreStats {
  store_name: string;
  revenue: number;
  transactions: number;
  target: number;
  percentage: number;
}

interface RecentSale {
  id: string;
  date: string;
  customer_name: string;
  store_name: string;
  amount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalSales: 0,
    totalRevenue: 0,
  });
  const [storeStats, setStoreStats] = useState<StoreStats[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Get total customers
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Get total sales and revenue (all time)
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('amount');

      if (salesError) throw salesError;

      const typedSalesData = salesData as SupabaseSalesAmount[];
      const totalRevenue = typedSalesData.reduce((sum, sale) => sum + sale.amount, 0);

      // Get current month store performance
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const year = new Date().getFullYear();
      const month = new Date().getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();

      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, store_name, monthly_target')
        .eq('status', 'active');

      if (storesError) throw storesError;

      // Get current month sales by store
      const { data: monthlySalesData, error: monthlySalesError } = await supabase
        .from('sales')
        .select('store_id, amount')
        .gte('date', `${currentMonth}-01`)
        .lte('date', `${currentMonth}-${lastDay.toString().padStart(2, '0')}`);

      if (monthlySalesError) throw monthlySalesError;

      const typedStores = storesData as SupabaseStoreData[];
      const typedMonthlySales = monthlySalesData as SupabaseMonthlySale[];

      const storePerformance: StoreStats[] = typedStores.map((store) => {
        const storeSales = typedMonthlySales.filter((s) => s.store_id === store.id);
        const revenue = storeSales.reduce((sum, s) => sum + (s.amount || 0), 0);
        const percentage = store.monthly_target > 0 ? (revenue / store.monthly_target) * 100 : 0;

        return {
          store_name: store.store_name,
          revenue,
          transactions: storeSales.length,
          target: store.monthly_target,
          percentage,
        };
      });

      // Get recent sales (last 10)
      const { data: recentSalesData, error: recentSalesError } = await supabase
        .from('sales')
        .select(`
          id,
          date,
          amount,
          customers!customer_id(name),
          stores!store_id(store_name)
        `)
        .order('date', { ascending: false })
        .limit(10);

      if (recentSalesError) throw recentSalesError;

      console.log('Recent sales raw data:', recentSalesData);

      const formattedRecentSales: RecentSale[] = (recentSalesData || []).map((sale: any) => {
        const customers = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
        const stores = Array.isArray(sale.stores) ? sale.stores[0] : sale.stores;
        
        return {
          id: sale.id,
          date: sale.date,
          customer_name: customers?.name || '不明',
          store_name: stores?.store_name || '不明',
          amount: sale.amount,
        };
      });

      setStats({
        totalCustomers: totalCustomers || 0,
        totalSales: typedSalesData?.length || 0,
        totalRevenue,
      });
      setStoreStats(storePerformance);
      setRecentSales(formattedRecentSales);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-100 text-green-800';
    if (percentage >= 80) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">ダッシュボード</h1>

        {/* Total Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Total Customers Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総顧客数</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalCustomers}
                </p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>

          {/* Total Sales Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総売上件数</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalSales.toLocaleString()}
                </p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>

          {/* Total Revenue Card */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">総売上額</p>
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>
        </div>

        {/* Store Performance */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">店舗別売上（今月）</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {storeStats.map((store) => (
                <div key={store.store_name} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{store.store_name}</h3>
                    <span className={`px-3 py-1 text-xs font-medium rounded ${getPerformanceColor(store.percentage)}`}>
                      {store.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-gray-500 text-xs">売上額</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(store.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">目標</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(store.target)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">取引数</p>
                      <p className="font-semibold text-gray-900">{store.transactions}件</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        store.percentage >= 100
                          ? 'bg-green-600'
                          : store.percentage >= 80
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(store.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">最近の売上</h2>
          </div>
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
                    顧客
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      売上データがありません
                    </td>
                  </tr>
                ) : (
                  recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(sale.date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {sale.store_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {sale.customer_name}
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
