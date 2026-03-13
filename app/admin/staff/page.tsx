'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/app/components/AdminLayout';
import { supabase } from '@/lib/supabase';

// Raw Supabase response types
interface SupabaseStore {
  store_name: string;
}

interface SupabaseStaffData {
  id: string;
  staff_code: string;
  name: string;
  email: string;
  phone: string;
  hire_date: string;
  status: string;
  home_store: SupabaseStore[];
}

interface SupabaseAssignment {
  staff_id: string;
  role: string;
  assignment_type: string;
  store: SupabaseStore[];
}

// Formatted types for component state
interface StaffAssignment {
  role: string;
  assignment_type: string;
  store: SupabaseStore[];
}

interface StaffMember {
  id: string;
  staff_code: string;
  name: string;
  email: string;
  phone: string;
  hire_date: string;
  status: string;
  home_store: SupabaseStore[];
  assignments: StaffAssignment[];
  max_role: string;
  max_role_level: number;
}

const ROLE_DISPLAY: Record<string, { ja: string; color: string; level: number }> = {
  system_admin: { ja: 'システム管理者', color: 'bg-red-100 text-red-800', level: 4 },
  regional_manager: { ja: '全店管理者', color: 'bg-purple-100 text-purple-800', level: 3 },
  store_manager: { ja: '店舗管理者', color: 'bg-blue-100 text-blue-800', level: 2 },
  staff: { ja: '一般従業員', color: 'bg-green-100 text-green-800', level: 1 },
};

export default function StaffPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);

      // Fetch staff with their assignments
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
        .order('hire_date', { ascending: false });

      if (staffError) throw staffError;

      // Fetch current assignments for each staff member
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('staff_store_assignments')
        .select(`
          staff_id,
          role,
          assignment_type,
          store:stores(store_name)
        `)
        .is('end_date', null); // Only current assignments

      if (assignmentsError) throw assignmentsError;

      const typedStaff = staffData as SupabaseStaffData[];
      const typedAssignments = assignmentsData as SupabaseAssignment[];

      // Combine data
      const combinedData: StaffMember[] = typedStaff.map((member) => {
        const memberAssignments = typedAssignments.filter(
          (a) => a.staff_id === member.id
        );

        // Calculate max role
        const maxRole = memberAssignments.reduce((max, assignment) => {
          const currentLevel = ROLE_DISPLAY[assignment.role]?.level || 0;
          const maxLevel = ROLE_DISPLAY[max]?.level || 0;
          return currentLevel > maxLevel ? assignment.role : max;
        }, 'staff');

        return {
          ...member,
          assignments: memberAssignments,
          max_role: maxRole,
          max_role_level: ROLE_DISPLAY[maxRole]?.level || 1,
        };
      });

      // Sort by role level (highest first), then by hire date
      combinedData.sort((a, b) => {
        if (a.max_role_level !== b.max_role_level) {
          return b.max_role_level - a.max_role_level;
        }
        return new Date(a.hire_date).getTime() - new Date(b.hire_date).getTime();
      });

      setStaff(combinedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staff');
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

  const getStoreList = (member: StaffMember) => {
    const storeNames = member.assignments
      .map((a) => (a.store && a.store.length > 0 ? a.store[0].store_name : 'すべての店舗'))
      .filter((name, index, self) => self.indexOf(name) === index);
    return storeNames.join(', ');
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">従業員管理</h1>
          <p className="text-gray-600 mt-2">
            総従業員数: {staff.length}名（在職中: {staff.filter((s) => s.status === 'active').length}名）
          </p>
        </div>

        {staff.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">従業員データがありません。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map((member) => (
              <div
                key={member.id}
                onClick={() => router.push(`/admin/staff/${member.id}`)}
                className="bg-white rounded-lg shadow hover:shadow-md transition p-6 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{member.staff_code}</p>
                    <div className="mt-2">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                          ROLE_DISPLAY[member.max_role]?.color || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {ROLE_DISPLAY[member.max_role]?.ja || member.max_role}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      member.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {member.status === 'active' ? '在職中' : '退職'}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">🏢</span>
                    <span className="truncate">{getStoreList(member) || '配属なし'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">📧</span>
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">📞</span>
                    <span>{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">📅</span>
                    <span>入社日: {formatDate(member.hire_date)}</span>
                  </div>
                </div>

                {member.assignments.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">配属詳細:</p>
                    <div className="space-y-1">
                      {member.assignments.map((assignment, index) => (
                        <div key={index} className="text-xs">
                          <span className="font-medium">
                            {assignment.store && assignment.store.length > 0
                              ? assignment.store[0].store_name
                              : 'すべての店舗'}
                          </span>
                          <span className="text-gray-500 ml-2">
                            ({ROLE_DISPLAY[assignment.role]?.ja || assignment.role}
                            {assignment.assignment_type === 'temporary' && ' - 応援'})
                          </span>
                        </div>
                      ))}
                    </div>
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
