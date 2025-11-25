'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    messagesToday: 0,
    activeUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('line_users')
        .select('*', { count: 'exact', head: true });

      // Get active users (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: activeUsers } = await supabase
        .from('line_users')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen_at', sevenDaysAgo.toISOString());

      setStats({
        totalUsers: totalUsers || 0,
        messagesToday: 0, // Mock data
        activeUsers: activeUsers || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">ダッシュボード</h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">読み込み中...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Users Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">総ユーザー数</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.totalUsers}
                  </p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
            </div>

            {/* Messages Today Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">今日の配信数</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.messagesToday}
                  </p>
                </div>
                <div className="text-4xl">📨</div>
              </div>
            </div>

            {/* Active Users Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    アクティブユーザー
                  </p>
                  <p className="text-sm text-gray-500 mt-1">過去7日間</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.activeUsers}
                  </p>
                </div>
                <div className="text-4xl">🔥</div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">最近のアクティビティ</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { time: '10分前', activity: '新規ユーザー登録', icon: '👤' },
                { time: '1時間前', activity: 'メッセージ配信完了', icon: '📢' },
                { time: '3時間前', activity: '管理画面アクセス', icon: '🔐' },
                { time: '5時間前', activity: '新規ユーザー登録', icon: '👤' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-4 py-2">
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.activity}</p>
                    <p className="text-xs text-gray-500">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
