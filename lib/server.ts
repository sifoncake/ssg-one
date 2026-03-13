import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase client with service role key (server-side only)
let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }

    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseAdmin;
}

// Verify LINE ID token and return LINE user ID
export async function verifyLineToken(idToken: string): Promise<string | null> {
  const channelId = process.env.MINI_APP_CHANNEL_ID;
  if (!channelId) {
    console.error('MINI_APP_CHANNEL_ID not configured');
    return null;
  }

  try {
    const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: channelId,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.sub || null;
  } catch {
    return null;
  }
}

export type Permission = 'admin' | 'payment' | 'report';

export type UserPermissions = {
  lineUserId: string;
  staffId: string | null;
  isAdmin: boolean;
  role: string | null;
  permissions: Permission[];
  storeIds: string[];
  hasAllStoreAccess: boolean;
};

// Get user permissions from LINE user ID
export async function getUserPermissions(lineUserId: string): Promise<UserPermissions> {
  const supabase = getSupabaseAdmin();

  const result: UserPermissions = {
    lineUserId,
    staffId: null,
    isAdmin: false,
    role: null,
    permissions: [],
    storeIds: [],
    hasAllStoreAccess: false,
  };

  // Check if user is admin
  const { data: adminData } = await supabase
    .from('admins')
    .select('id')
    .eq('line_user_id', lineUserId)
    .single();

  result.isAdmin = !!adminData;

  // Get staff info
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id')
    .eq('line_user_id', lineUserId)
    .single();

  console.log('getUserPermissions - staff lookup for:', lineUserId);
  console.log('getUserPermissions - staffData:', staffData);
  console.log('getUserPermissions - staffError:', staffError);

  if (staffData) {
    result.staffId = staffData.id;

    // Get store assignments
    const { data: assignments } = await supabase
      .from('staff_store_assignments')
      .select('store_id, role')
      .eq('staff_id', staffData.id)
      .is('end_date', null)
      .lte('start_date', new Date().toISOString().split('T')[0]);

    if (assignments && assignments.length > 0) {
      // Get highest role
      const roleOrder = ['system_admin', 'regional_manager', 'store_manager', 'staff'];
      for (const r of roleOrder) {
        if (assignments.some(a => a.role === r)) {
          result.role = r;
          break;
        }
      }

      // Check all store access
      result.hasAllStoreAccess = assignments.some(a =>
        ['regional_manager', 'system_admin'].includes(a.role)
      );

      // Get store IDs
      result.storeIds = assignments
        .filter(a => a.store_id)
        .map(a => a.store_id);
    }
  }

  // Set permissions based on role
  if (result.isAdmin || result.role === 'system_admin' || result.role === 'regional_manager') {
    result.permissions = ['admin', 'payment', 'report'];
    result.hasAllStoreAccess = true;
  } else if (result.role === 'store_manager') {
    result.permissions = ['payment', 'report'];
  } else if (result.role === 'staff') {
    result.permissions = ['report'];
  }

  return result;
}

// Check if user has specific permission
export async function hasPermission(lineUserId: string, permission: Permission): Promise<boolean> {
  const userPermissions = await getUserPermissions(lineUserId);
  return userPermissions.permissions.includes(permission);
}
