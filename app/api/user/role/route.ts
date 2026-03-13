import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const lineUserId = request.nextUrl.searchParams.get('lineUserId');

    if (!lineUserId) {
      return NextResponse.json({ error: 'lineUserId is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is in admins table
    const { data: adminData } = await supabase
      .from('admins')
      .select('id')
      .eq('line_user_id', lineUserId)
      .single();

    const isAdmin = !!adminData;

    // Get staff record and role from staff_store_assignments
    const { data: staffData } = await supabase
      .from('staff')
      .select('id, line_user_id')
      .eq('line_user_id', lineUserId)
      .single();

    let role = null;
    let permissions: string[] = [];

    if (staffData) {
      // Get the highest role from staff_store_assignments
      const { data: assignments } = await supabase
        .from('staff_store_assignments')
        .select('role')
        .eq('staff_id', staffData.id)
        .is('end_date', null)
        .lte('start_date', new Date().toISOString().split('T')[0]);

      if (assignments && assignments.length > 0) {
        // Get highest role
        const roleOrder = ['system_admin', 'regional_manager', 'store_manager', 'staff'];
        for (const r of roleOrder) {
          if (assignments.some(a => a.role === r)) {
            role = r;
            break;
          }
        }
      }
    }

    // Set permissions based on role
    if (isAdmin || role === 'system_admin' || role === 'regional_manager') {
      permissions = ['admin', 'payment', 'report'];
    } else if (role === 'store_manager') {
      permissions = ['payment', 'report'];
    } else if (role === 'staff') {
      permissions = ['report'];
    }

    return NextResponse.json({
      isAdmin,
      role,
      permissions,
    });
  } catch (error) {
    console.error('Error checking user role:', error);
    return NextResponse.json(
      { error: 'Failed to check user role' },
      { status: 500 }
    );
  }
}
