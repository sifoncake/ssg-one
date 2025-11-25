'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import { supabase } from '@/lib/supabase';

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    activeUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('line_users')
        .select('*', { count: 'exact', head: true });

      // Get users from this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const { count: newUsersThisWeek } = await supabase
        .from('line_users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString());

      // Get users from this month
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const { count: newUsersThisMonth } = await supabase
        .from('line_users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneMonthAgo.toISOString());

      // Get active users (last 7 days)
      const { count: activeUsers } = await supabase
        .from('line_users')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen_at', oneWeekAgo.toISOString());

      setStats({
        totalUsers: totalUsers || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
        activeUsers: activeUsers || 0,
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const mockChartData = [
    { day: '月', users: 12 },
    { day: '火', users: 15 },
    { day: '水', users: 8 },
    { day: '木', users: 20 },
    { day: '金', users: 25 },
    { day: '土', users: 18 },
    { day: '日', users: 22 },
  ];

  const maxUsers = Math.max(...mockChartData.map((d) => d.users));

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">分析</h1>
          <p className="text-gray-600 mt-2">
            ユーザーの成長とエンゲージメント指標
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">読み込み中...</div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm font-medium text-gray-600">総ユーザー数</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalUsers}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm font-medium text-gray-600">今週の新規</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  +{stats.newUsersThisWeek}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm font-medium text-gray-600">今月の新規</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  +{stats.newUsersThisMonth}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm font-medium text-gray-600">アクティブ</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {stats.activeUsers}
                </p>
              </div>
            </div>

            {/* User Growth Chart */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                週間ユーザー推移
              </h2>
              <div className="flex items-end justify-between h-64 gap-4">
                {mockChartData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex items-end justify-center h-56">
                      <div
                        className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600 relative group"
                        style={{
                          height: `${(data.users / maxUsers) * 100}%`,
                        }}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          {data.users}名
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{data.day}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Engagement Metrics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                エンゲージメント指標
              </h2>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      アクティブ率
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {stats.totalUsers > 0
                        ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all"
                      style={{
                        width: `${
                          stats.totalUsers > 0
                            ? (stats.activeUsers / stats.totalUsers) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      今週の成長率
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {stats.totalUsers > 0
                        ? Math.round(
                            (stats.newUsersThisWeek / stats.totalUsers) * 100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-500 h-3 rounded-full transition-all"
                      style={{
                        width: `${
                          stats.totalUsers > 0
                            ? (stats.newUsersThisWeek / stats.totalUsers) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      メッセージ開封率 (モック)
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      85%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-purple-500 h-3 rounded-full transition-all"
                      style={{ width: '85%' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
