'use client';

import { useEffect, useState } from 'react';
import liff from '@line/liff';

type Store = {
  id: string;
  store_name: string;
};

type AttendanceStatus = 'not_clocked_in' | 'working' | 'clocked_out';

type TodayAttendance = {
  id: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  stores: { store_name: string };
};

export default function AttendancePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [status, setStatus] = useState<AttendanceStatus>('not_clocked_in');
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [monthlyData, setMonthlyData] = useState<{ workDays: number; workHours: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

        // Fetch stores
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

        // Fetch today's attendance
        await fetchAttendance(idToken);
      } catch (e) {
        console.error('Init error:', e);
        setError('初期化に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const fetchAttendance = async (idToken: string | null) => {
    if (!idToken) return;
    try {
      const response = await fetch('/api/attendance', {
        headers: { 'x-line-id-token': idToken },
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
        setTodayAttendance(data.today);
        setMonthlyData(data.monthly);
      }
    } catch (e) {
      console.error('Failed to fetch attendance:', e);
    }
  };

  const handleClockIn = async () => {
    if (!selectedStore) {
      setError('店舗を選択してください');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const idToken = liff.getIDToken();

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineIdToken: idToken,
          storeId: selectedStore,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '出勤打刻に失敗しました');
        return;
      }

      setSuccessMessage('出勤しました');
      await fetchAttendance(idToken);

    } catch (e) {
      console.error('Clock in error:', e);
      setError('エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const idToken = liff.getIDToken();

      const response = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineIdToken: idToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '退勤打刻に失敗しました');
        return;
      }

      setSuccessMessage('お疲れさまでした');
      await fetchAttendance(idToken);

    } catch (e) {
      console.error('Clock out error:', e);
      setError('エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    window.location.href = '/mini-app';
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  const getWorkingTime = () => {
    if (!todayAttendance?.clock_in) return null;
    const clockIn = new Date(todayAttendance.clock_in);
    const clockOut = todayAttendance.clock_out ? new Date(todayAttendance.clock_out) : new Date();
    const minutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins}分`;
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
          <h1 className="text-lg font-bold text-gray-900">🕐 出退勤</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Status Display */}
        <div className={`rounded-lg p-6 text-center ${
          status === 'working' ? 'bg-green-50' :
          status === 'clocked_out' ? 'bg-gray-100' :
          'bg-blue-50'
        }`}>
          <p className={`text-sm mb-2 ${
            status === 'working' ? 'text-green-600' :
            status === 'clocked_out' ? 'text-gray-600' :
            'text-blue-600'
          }`}>
            {status === 'working' ? '勤務中' :
             status === 'clocked_out' ? '本日の勤務終了' :
             '未出勤'}
          </p>
          {status === 'working' && todayAttendance && (
            <>
              <p className="text-3xl font-bold text-green-900">{getWorkingTime()}</p>
              <p className="text-sm text-green-600 mt-2">
                {todayAttendance.stores?.store_name} {formatTime(todayAttendance.clock_in)}〜
              </p>
            </>
          )}
          {status === 'clocked_out' && todayAttendance && (
            <>
              <p className="text-2xl font-bold text-gray-900">
                {formatTime(todayAttendance.clock_in)} 〜 {formatTime(todayAttendance.clock_out!)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {todayAttendance.stores?.store_name}（休憩 {todayAttendance.break_minutes}分）
              </p>
            </>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-center">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Clock In */}
        {status === 'not_clocked_in' && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">勤務店舗</label>
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

            <button
              onClick={handleClockIn}
              disabled={isSubmitting || !selectedStore}
              className={`w-full py-6 rounded-lg text-white font-bold text-xl ${
                isSubmitting || !selectedStore
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 active:bg-green-700'
              }`}
            >
              {isSubmitting ? '処理中...' : '出勤'}
            </button>
          </>
        )}

        {/* Clock Out */}
        {status === 'working' && (
          <button
            onClick={handleClockOut}
            disabled={isSubmitting}
            className={`w-full py-6 rounded-lg text-white font-bold text-xl ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-600 active:bg-red-700'
            }`}
          >
            {isSubmitting ? '処理中...' : '退勤'}
          </button>
        )}

        {/* Monthly Summary */}
        {monthlyData && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">今月の勤務状況</p>
            <div className="flex justify-around">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{monthlyData.workDays}</p>
                <p className="text-xs text-gray-500">出勤日数</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{monthlyData.workHours}</p>
                <p className="text-xs text-gray-500">勤務時間</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
