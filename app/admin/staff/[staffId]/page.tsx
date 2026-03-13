'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/app/components/AdminLayout';
import { supabase } from '@/lib/supabase';

interface StaffDetail {
  id: string;
  staff_code: string;
  name: string;
  email: string;
  phone: string;
  hire_date: string;
  status: string;
  home_store: { store_name: string }[] | null;
}

interface Assignment {
  role: string;
  assignment_type: string;
  start_date: string;
  store: { store_name: string }[] | null;
}

interface AttendanceRecord {
  id: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  stores: { store_name: string }[] | null;
}

const ROLE_DISPLAY: Record<string, { ja: string; color: string }> = {
  system_admin: { ja: 'システム管理者', color: 'bg-red-100 text-red-800' },
  regional_manager: { ja: '全店管理者', color: 'bg-purple-100 text-purple-800' },
  store_manager: { ja: '店舗管理者', color: 'bg-blue-100 text-blue-800' },
  staff: { ja: '一般従業員', color: 'bg-green-100 text-green-800' },
};

export default function StaffDetailPage({ params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = use(params);
  const router = useRouter();
  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchStaffDetail();
  }, [staffId]);

  useEffect(() => {
    if (staff) {
      fetchAttendance();
    }
  }, [staff, selectedMonth]);

  const fetchStaffDetail = async () => {
    try {
      setLoading(true);

      // Fetch staff info
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select(`
          id,
          staff_code,
          name,
          email,
          phone,
          hire_date,
          status,
          home_store:stores!staff_home_store_id_fkey(store_name)
        `)
        .eq('id', staffId)
        .single();

      if (staffError) throw staffError;
      setStaff(staffData as StaffDetail);

      // Fetch assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('staff_store_assignments')
        .select(`
          role,
          assignment_type,
          start_date,
          store:stores(store_name)
        `)
        .eq('staff_id', staffId)
        .is('end_date', null)
        .order('start_date', { ascending: false });

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData as Assignment[]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staff');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

      const { data, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          id,
          date,
          clock_in,
          clock_out,
          break_minutes,
          stores(store_name)
        `)
        .eq('staff_id', staffId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (attendanceError) throw attendanceError;
      setAttendance(data as AttendanceRecord[]);

    } catch (err) {
      console.error('Failed to fetch attendance:', err);
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

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateWorkHours = (clockIn: string, clockOut: string | null, breakMinutes: number) => {
    if (!clockOut) return '-';
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    const minutes = (end.getTime() - start.getTime()) / (1000 * 60) - breakMinutes;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}:${String(mins).padStart(2, '0')}`;
  };

  const getMonthlySummary = () => {
    let totalMinutes = 0;
    let workDays = 0;

    for (const record of attendance) {
      if (record.clock_in && record.clock_out) {
        const start = new Date(record.clock_in);
        const end = new Date(record.clock_out);
        const minutes = (end.getTime() - start.getTime()) / (1000 * 60) - record.break_minutes;
        totalMinutes += minutes;
        workDays++;
      }
    }

    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    return { workDays, totalHours: `${hours}:${String(mins).padStart(2, '0')}` };
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

  if (error || !staff) {
    return (
      <AdminLayout>
        <div className="bg-red-50 text-red-800 p-4 rounded-md border border-red-200">
          エラー: {error || '従業員が見つかりません'}
        </div>
      </AdminLayout>
    );
  }

  const summary = getMonthlySummary();

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/staff')}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            ← 従業員一覧に戻る
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{staff.name}</h1>
              <p className="text-gray-500 mt-1">{staff.staff_code}</p>
            </div>
            <span
              className={`px-3 py-1 text-sm font-medium rounded ${
                staff.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {staff.status === 'active' ? '在職中' : '退職'}
            </span>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">メールアドレス</p>
              <p className="text-gray-900">{staff.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">電話番号</p>
              <p className="text-gray-900">{staff.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">入社日</p>
              <p className="text-gray-900">{formatDate(staff.hire_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">所属店舗</p>
              <p className="text-gray-900">
                {staff.home_store?.[0]?.store_name || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Roles */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">役割・配属</h2>
          {assignments.length === 0 ? (
            <p className="text-gray-500">配属情報がありません</p>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        ROLE_DISPLAY[assignment.role]?.color || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {ROLE_DISPLAY[assignment.role]?.ja || assignment.role}
                    </span>
                    <span className="ml-2 text-gray-700">
                      {assignment.store?.[0]?.store_name || 'すべての店舗'}
                    </span>
                    {assignment.assignment_type === 'temporary' && (
                      <span className="ml-2 text-xs text-orange-600">（応援）</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(assignment.start_date)}〜
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">勤務状況</h2>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Monthly Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-600">出勤日数</p>
              <p className="text-2xl font-bold text-blue-900">{summary.workDays}日</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-sm text-green-600">総勤務時間</p>
              <p className="text-2xl font-bold text-green-900">{summary.totalHours}</p>
            </div>
          </div>

          {/* Attendance List */}
          {attendance.length === 0 ? (
            <p className="text-gray-500 text-center py-4">この月の勤務記録がありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">日付</th>
                    <th className="text-left py-2 px-2">店舗</th>
                    <th className="text-left py-2 px-2">出勤</th>
                    <th className="text-left py-2 px-2">退勤</th>
                    <th className="text-left py-2 px-2">休憩</th>
                    <th className="text-left py-2 px-2">勤務時間</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2">{formatDate(record.date)}</td>
                      <td className="py-2 px-2">{record.stores?.[0]?.store_name || '-'}</td>
                      <td className="py-2 px-2">{formatTime(record.clock_in)}</td>
                      <td className="py-2 px-2">
                        {record.clock_out ? formatTime(record.clock_out) : (
                          <span className="text-green-600">勤務中</span>
                        )}
                      </td>
                      <td className="py-2 px-2">{record.break_minutes}分</td>
                      <td className="py-2 px-2">
                        {calculateWorkHours(record.clock_in, record.clock_out, record.break_minutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
