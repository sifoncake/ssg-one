'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import { supabase } from '@/lib/supabase';

// Raw Supabase response types
interface SupabaseStoreData {
  id: string;
  store_code: string;
  store_name: string;
  location: string;
  opening_date: string;
  manager_name: string;
  phone: string;
  status: string;
  monthly_target: number;
}

interface SupabaseStaffAssignment {
  store_id: string;
}

interface SupabaseSale {
  store_id: string;
  amount: number;
}

// Formatted types for component state
interface Store {
  id: string;
  store_code: string;
  store_name: string;
  location: string;
  opening_date: string;
  manager_name: string;
  phone: string;
  status: string;
  monthly_target: number;
  staff_count: number;
  current_month_revenue: number;
  performance_percentage: number;
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);

      // Fetch stores
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .order('opening_date');

      if (storesError) throw storesError;

      // Fetch staff count for each store
      const { data: staffData, error: staffError } = await supabase
        .from('staff_store_assignments')
        .select('store_id')
        .is('end_date', null);

      if (staffError) throw staffError;

      // Fetch current month revenue
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const year = new Date().getFullYear();
      const month = new Date().getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('store_id, amount')
        .gte('date', `${currentMonth}-01`)
        .lte('date', `${currentMonth}-${lastDay.toString().padStart(2, '0')}`);

      if (salesError) throw salesError;

      const typedStores = storesData as SupabaseStoreData[];
      const typedStaff = staffData as SupabaseStaffAssignment[];
      const typedSales = salesData as SupabaseSale[];

      // Combine data
      const combinedData: Store[] = typedStores.map((store) => {
        const staffCount = typedStaff.filter(
          (s) => s.store_id === store.id
        ).length;

        const revenue = typedSales
          .filter((s) => s.store_id === store.id)
          .reduce((sum, s) => sum + (s.amount || 0), 0);

        const performancePercentage = store.monthly_target > 0
          ? (revenue / store.monthly_target) * 100
          : 0;

        return {
          ...store,
          staff_count: staffCount,
          current_month_revenue: revenue,
          performance_percentage: performancePercentage,
        };
      });

      setStores(combinedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stores');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-100 text-green-800 border-green-200';
    if (percentage >= 80) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getPerformanceLabel = (percentage: number) => {
    if (percentage >= 100) return '目標達成';
    if (percentage >= 80) return '目標80%以上';
    return '目標未達';
  };

  const getYearsSinceOpening = (openingDate: string) => {
    const years = new Date().getFullYear() - new Date(openingDate).getFullYear();
    const months = new Date().getMonth() - new Date(openingDate).getMonth();
    const totalMonths = years * 12 + months;

    if (totalMonths < 12) {
      return `開店${totalMonths}ヶ月`;
    }
    return `開店${years}年`;
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">店舗管理</h1>
          <p className="text-gray-600 mt-2">総店舗数: {stores.length}店舗</p>
        </div>

        {stores.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">店舗データがありません。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <div
                key={store.id}
                className={`bg-white rounded-lg shadow-lg border-2 transition hover:shadow-xl ${
                  getPerformanceColor(store.performance_percentage)
                }`}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{store.store_name}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          store.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {store.status === 'active' ? '営業中' : '休業中'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{store.store_code}</p>
                    <p className="text-xs text-gray-500 mt-1">{getYearsSinceOpening(store.opening_date)}</p>
                  </div>

                  {/* Location */}
                  <div className="mb-4 space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400">📍</span>
                      <span className="text-gray-700">{store.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📞</span>
                      <span className="text-gray-700">{store.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">👔</span>
                      <span className="text-gray-700">店長: {store.manager_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">👥</span>
                      <span className="text-gray-700">スタッフ: {store.staff_count}名</span>
                    </div>
                  </div>

                  {/* Performance */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">今月の売上</span>
                        <span className="font-bold text-gray-900">
                          {formatCurrency(store.current_month_revenue)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 mb-2">
                        <span>目標</span>
                        <span>{formatCurrency(store.monthly_target)}</span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${
                            store.performance_percentage >= 100
                              ? 'bg-green-600'
                              : store.performance_percentage >= 80
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{
                            width: `${Math.min(store.performance_percentage, 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        {getPerformanceLabel(store.performance_percentage)}
                      </span>
                      <span className="text-lg font-bold">
                        {store.performance_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Opening Date */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      開店日: {formatDate(store.opening_date)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
